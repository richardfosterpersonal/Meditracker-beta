const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const imageminSvgo = require('imagemin-svgo');
const { gzip } = require('zlib');
const { promisify } = require('util');

const gzipAsync = promisify(gzip);

// Configuration
const BUILD_DIR = path.join(__dirname, '../build');
const ASSET_EXTENSIONS = ['.js', '.css', '.html', '.json'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.svg'];

async function optimizeImages() {
  console.log('Optimizing images...');

  const images = await imagemin([`${BUILD_DIR}/**/*.{jpg,jpeg,png,svg}`], {
    plugins: [
      imageminMozjpeg({ quality: 80 }),
      imageminPngquant({
        quality: [0.6, 0.8],
      }),
      imageminSvgo({
        plugins: [
          {
            name: 'removeViewBox',
            active: false,
          },
        ],
      }),
    ],
  });

  // Save optimized images
  for (const image of images) {
    fs.writeFileSync(image.destinationPath, image.data);
  }

  console.log(`Optimized ${images.length} images`);
}

async function compressAssets() {
  console.log('Compressing assets...');

  const files = getAllFiles(BUILD_DIR);
  let compressedCount = 0;

  for (const file of files) {
    const ext = path.extname(file);
    if (ASSET_EXTENSIONS.includes(ext)) {
      const content = fs.readFileSync(file);
      const compressed = await gzipAsync(content);
      fs.writeFileSync(`${file}.gz`, compressed);
      compressedCount++;
    }
  }

  console.log(`Compressed ${compressedCount} assets`);
}

function getAllFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function inlineSmallAssets() {
  console.log('Inlining small assets...');

  const htmlFiles = getAllFiles(BUILD_DIR).filter(file => path.extname(file) === '.html');
  let inlinedCount = 0;

  for (const htmlFile of htmlFiles) {
    let content = fs.readFileSync(htmlFile, 'utf8');
    
    // Inline small CSS files
    content = content.replace(
      /<link[^>]+href="([^"]+\.css)"[^>]*>/g,
      (match, cssPath) => {
        const fullPath = path.join(BUILD_DIR, cssPath);
        if (fs.existsSync(fullPath)) {
          const css = fs.readFileSync(fullPath, 'utf8');
          if (css.length < 10000) { // Only inline if less than 10KB
            inlinedCount++;
            return `<style>${css}</style>`;
          }
        }
        return match;
      }
    );

    // Inline small JavaScript files
    content = content.replace(
      /<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/g,
      (match, jsPath) => {
        const fullPath = path.join(BUILD_DIR, jsPath);
        if (fs.existsSync(fullPath)) {
          const js = fs.readFileSync(fullPath, 'utf8');
          if (js.length < 10000) { // Only inline if less than 10KB
            inlinedCount++;
            return `<script>${js}</script>`;
          }
        }
        return match;
      }
    );

    fs.writeFileSync(htmlFile, content);
  }

  console.log(`Inlined ${inlinedCount} small assets`);
}

function optimizeHtml() {
  console.log('Optimizing HTML...');

  const htmlFiles = getAllFiles(BUILD_DIR).filter(file => path.extname(file) === '.html');
  
  for (const htmlFile of htmlFiles) {
    let content = fs.readFileSync(htmlFile, 'utf8');
    
    // Remove comments
    content = content.replace(/<!--(?![\s\S]*-->)[\s\S]*?-->/g, '');
    
    // Remove whitespace
    content = content.replace(/\s+/g, ' ');
    
    // Remove empty attributes
    content = content.replace(/\w+=""/g, '');
    
    fs.writeFileSync(htmlFile, content);
  }

  console.log(`Optimized ${htmlFiles.length} HTML files`);
}

function generateResourceHints() {
  console.log('Generating resource hints...');

  const htmlFiles = getAllFiles(BUILD_DIR).filter(file => path.extname(file) === '.html');
  
  for (const htmlFile of htmlFiles) {
    let content = fs.readFileSync(htmlFile, 'utf8');
    const head = content.match(/<head>[\s\S]*?<\/head>/)[0];
    
    // Add preload for critical assets
    const criticalAssets = [
      ...head.match(/href="([^"]+\.css)"/g) || [],
      ...head.match(/src="([^"]+\.js)"/g) || [],
    ].map(match => match.match(/"([^"]+)"/)[1]);

    const preloads = criticalAssets
      .map(asset => `<link rel="preload" href="${asset}" as="${asset.endsWith('.css') ? 'style' : 'script'}">`)
      .join('');

    content = content.replace('</head>', `${preloads}</head>`);
    
    fs.writeFileSync(htmlFile, content);
  }

  console.log('Generated resource hints');
}

async function main() {
  try {
    console.log('Starting production optimization...');
    
    // Run optimizations
    await optimizeImages();
    await compressAssets();
    inlineSmallAssets();
    optimizeHtml();
    generateResourceHints();
    
    console.log('Production optimization completed successfully!');
  } catch (error) {
    console.error('Optimization failed:', error);
    process.exit(1);
  }
}

main();
