const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { program } = require('commander');
const { promisify } = require('util');
const glob = promisify(require('glob'));

// Load production config
const prodConfig = require('../config/production.config.js');

// Configure AWS
AWS.config.update({
  region: prodConfig.cdn.region,
});

const s3 = new AWS.S3();
const cloudfront = new AWS.CloudFront();

// Configuration
const config = {
  bucketName: prodConfig.cdn.bucket,
  distribution: process.env.CLOUDFRONT_DISTRIBUTION_ID,
  buildDir: path.join(__dirname, '../build'),
  cacheRules: {
    // Cache configuration for different file types
    'text/html': {
      maxAge: 0,
      swr: '5m',
    },
    'text/css': {
      maxAge: '1y',
      immutable: true,
    },
    'application/javascript': {
      maxAge: '1y',
      immutable: true,
    },
    'image/*': {
      maxAge: '1y',
      immutable: true,
    },
    'font/*': {
      maxAge: '1y',
      immutable: true,
    },
    'application/json': {
      maxAge: '5m',
      swr: '1h',
    },
  },
};

async function createBucket() {
  console.log(`Creating bucket: ${config.bucketName}`);
  
  try {
    await s3.createBucket({
      Bucket: config.bucketName,
      ACL: 'private',
    }).promise();

    // Enable bucket versioning
    await s3.putBucketVersioning({
      Bucket: config.bucketName,
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    }).promise();

    // Configure bucket policy
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: {
            AWS: `arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${config.distribution}`,
          },
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${config.bucketName}/*`,
        },
      ],
    };

    await s3.putBucketPolicy({
      Bucket: config.bucketName,
      Policy: JSON.stringify(bucketPolicy),
    }).promise();

    console.log('Bucket created and configured successfully!');
  } catch (error) {
    if (error.code === 'BucketAlreadyOwnedByYou') {
      console.log('Bucket already exists and is owned by you.');
    } else {
      throw error;
    }
  }
}

async function uploadToCDN() {
  console.log('Uploading files to CDN...');

  // Get all files from build directory
  const files = await glob('**/*', {
    cwd: config.buildDir,
    nodir: true,
  });

  let uploadedFiles = 0;
  const totalFiles = files.length;

  for (const file of files) {
    const filePath = path.join(config.buildDir, file);
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    const cacheRule = config.cacheRules[contentType] || config.cacheRules['application/octet-stream'];

    const params = {
      Bucket: config.bucketName,
      Key: file,
      Body: fs.createReadStream(filePath),
      ContentType: contentType,
      CacheControl: getCacheControlHeader(cacheRule),
    };

    try {
      await s3.upload(params).promise();
      uploadedFiles++;
      console.log(`Uploaded (${uploadedFiles}/${totalFiles}): ${file}`);
    } catch (error) {
      console.error(`Failed to upload ${file}:`, error);
      throw error;
    }
  }

  console.log('All files uploaded successfully!');
}

function getCacheControlHeader(rule) {
  const directives = [];
  
  if (rule.maxAge) {
    directives.push(`max-age=${parseDuration(rule.maxAge)}`);
  }
  
  if (rule.swr) {
    directives.push(`stale-while-revalidate=${parseDuration(rule.swr)}`);
  }
  
  if (rule.immutable) {
    directives.push('immutable');
  }
  
  return directives.join(', ');
}

function parseDuration(duration) {
  const units = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    y: 31536000,
  };

  const match = duration.match(/^(\d+)([smhdwy])$/);
  if (!match) {
    throw new Error(`Invalid duration: ${duration}`);
  }

  const [, value, unit] = match;
  return parseInt(value) * units[unit];
}

async function invalidateCache() {
  console.log('Invalidating CloudFront cache...');

  const params = {
    DistributionId: config.distribution,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: {
        Quantity: 1,
        Items: ['/*'],
      },
    },
  };

  try {
    const result = await cloudfront.createInvalidation(params).promise();
    console.log(`Cache invalidation created: ${result.Invalidation.Id}`);
  } catch (error) {
    console.error('Failed to invalidate cache:', error);
    throw error;
  }
}

async function configureCDN() {
  console.log('Configuring CDN...');

  // Create or update CloudFront distribution
  const params = {
    DistributionConfig: {
      CallerReference: Date.now().toString(),
      DefaultRootObject: 'index.html',
      Origins: {
        Quantity: 1,
        Items: [
          {
            Id: 'S3Origin',
            DomainName: `${config.bucketName}.s3.${AWS.config.region}.amazonaws.com`,
            S3OriginConfig: {
              OriginAccessIdentity: `origin-access-identity/cloudfront/${config.distribution}`,
            },
          },
        ],
      },
      DefaultCacheBehavior: {
        TargetOriginId: 'S3Origin',
        ForwardedValues: {
          QueryString: false,
          Cookies: {
            Forward: 'none',
          },
        },
        ViewerProtocolPolicy: 'redirect-to-https',
        MinTTL: 0,
        DefaultTTL: 86400,
        MaxTTL: 31536000,
        Compress: true,
      },
      Enabled: true,
      Comment: 'Medication Tracker CDN',
      PriceClass: 'PriceClass_100',
      ViewerCertificate: {
        CloudFrontDefaultCertificate: true,
      },
      CustomErrorResponses: {
        Quantity: 1,
        Items: [
          {
            ErrorCode: 404,
            ResponsePagePath: '/index.html',
            ResponseCode: '200',
            ErrorCachingMinTTL: 300,
          },
        ],
      },
    },
  };

  try {
    if (config.distribution) {
      await cloudfront.updateDistribution(params).promise();
      console.log('CloudFront distribution updated successfully!');
    } else {
      const result = await cloudfront.createDistribution(params).promise();
      console.log(`CloudFront distribution created: ${result.Distribution.Id}`);
    }
  } catch (error) {
    console.error('Failed to configure CDN:', error);
    throw error;
  }
}

// CLI commands
program
  .version('1.0.0')
  .description('CDN management tool');

program
  .command('setup')
  .description('Set up CDN infrastructure')
  .action(async () => {
    try {
      await createBucket();
      await configureCDN();
    } catch (error) {
      console.error('Failed to set up CDN:', error);
      process.exit(1);
    }
  });

program
  .command('deploy')
  .description('Deploy files to CDN')
  .action(async () => {
    try {
      await uploadToCDN();
      await invalidateCache();
    } catch (error) {
      console.error('Failed to deploy to CDN:', error);
      process.exit(1);
    }
  });

program
  .command('invalidate')
  .description('Invalidate CDN cache')
  .action(async () => {
    try {
      await invalidateCache();
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
