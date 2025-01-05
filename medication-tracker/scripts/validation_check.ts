/**
 * Validation Check Script
 * 
 * This script MUST be run before any changes are made to the codebase.
 * It enforces the pre-action validation protocol by:
 * 1. Checking for validation evidence
 * 2. Verifying documentation review
 * 3. Ensuring critical path alignment
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as crypto from 'crypto';

// Configuration file paths
const CONFIG_FILE = '.validation-config.json';
const OVERRIDE_FILE = '.validation-override.json';

// Self-maintenance paths - these are exempt from validation
const SELF_MAINTENANCE_PATHS = [
    'scripts/validation_check.ts',
    'scripts/validation-control.bat',
    'docs/VALIDATION_CHECKPOINTS.md',
    'docs/VALIDATION_OVERRIDE.md',
    'docs/validation/templates/',
    '.validation-config.json',
    '.validation-override.json'
];

// Critical files for health check
const CRITICAL_FILES = [
    {
        path: 'scripts/validation_check.ts',
        recoveryPath: 'scripts/backup/validation_check.backup.ts'
    },
    {
        path: 'scripts/validation-control.bat',
        recoveryPath: 'scripts/backup/validation-control.backup.bat'
    },
    {
        path: 'docs/VALIDATION_CHECKPOINTS.md',
        recoveryPath: 'docs/backup/VALIDATION_CHECKPOINTS.backup.md'
    }
];

interface ValidationConfig {
    enabled: boolean;
    lastDisabled: string;
    disabledBy: string;
    reason: string;
}

// Load or create config
function loadConfig(): ValidationConfig {
    const configPath = path.join(process.cwd(), CONFIG_FILE);
    if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    const defaultConfig: ValidationConfig = {
        enabled: true,
        lastDisabled: '',
        disabledBy: '',
        reason: ''
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
}

// Save config
function saveConfig(config: ValidationConfig): void {
    const configPath = path.join(process.cwd(), CONFIG_FILE);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Disable validation system
function disableValidation(user: string, reason: string): void {
    const config = loadConfig();
    config.enabled = false;
    config.lastDisabled = new Date().toISOString();
    config.disabledBy = user;
    config.reason = reason;
    saveConfig(config);
    
    console.log('\n🚫 Validation System Disabled');
    console.log(`Disabled by: ${user}`);
    console.log(`Reason: ${reason}`);
    console.log(`Time: ${config.lastDisabled}`);
    console.log('\nTo re-enable: npm run validate --enable');
}

// Enable validation system
function enableValidation(): void {
    const config = loadConfig();
    config.enabled = true;
    config.lastDisabled = '';
    config.disabledBy = '';
    config.reason = '';
    saveConfig(config);
    
    console.log('\n✅ Validation System Enabled');
}

// Quick override for the current git commit only
function quickOverride(): void {
    // Create a temporary override file that will be deleted after the commit
    const token = crypto.randomBytes(16).toString('hex');
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 5); // Valid for 5 minutes
    
    const config = {
        enabled: true,
        token,
        expiry,
        reason: 'Quick override for single commit'
    };

    const overridePath = path.join(process.cwd(), OVERRIDE_FILE);
    fs.writeFileSync(overridePath, JSON.stringify(config, null, 2));
    
    // Set environment variable for git hooks
    process.env.VALIDATION_QUICK_OVERRIDE = token;
    
    console.log('\n⚡ Quick Override Active (5 minutes)');
    console.log('This override will be automatically removed after commit');
}

interface ValidationCheck {
    type: string;
    path: string;
    required: boolean;
    message: string;
}

const VALIDATION_CHECKS: ValidationCheck[] = [
    {
        type: 'file',
        path: 'docs/validation/2024-12-24_comprehensive_validation.md',
        required: true,
        message: '❌ STOP: You must review the comprehensive validation document first'
    },
    {
        type: 'file',
        path: 'docs/VALIDATION_CHECKPOINTS.md',
        required: true,
        message: '❌ STOP: Validation checkpoints must be reviewed'
    },
    {
        type: 'file',
        path: 'docs/templates/pre_action_validation.md',
        required: true,
        message: '❌ STOP: Pre-action validation template must be used'
    }
];

// Load override configuration
function loadOverrideConfig(): any | null {
    const overridePath = path.join(process.cwd(), OVERRIDE_FILE);
    if (fs.existsSync(overridePath)) {
        const config = JSON.parse(fs.readFileSync(overridePath, 'utf8'));
        if (config.expiry && new Date(config.expiry) > new Date()) {
            return config;
        }
        // Clean up expired override
        fs.unlinkSync(overridePath);
    }
    return null;
}

// Create override token
function createOverride(hours: number, reason: string): void {
    const token = crypto.randomBytes(16).toString('hex');
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    
    const config: any = {
        enabled: true,
        token,
        expiry,
        reason
    };

    const overridePath = path.join(process.cwd(), OVERRIDE_FILE);
    fs.writeFileSync(overridePath, JSON.stringify(config, null, 2));
    
    console.log('\n🔑 Override Token Created');
    console.log(`Token: ${token}`);
    console.log(`Expires: ${expiry.toISOString()}`);
    console.log(`Reason: ${reason}`);
    console.log('\nTo use override: npm run validate --override=YOUR_TOKEN');
}

async function performHealthCheck(): Promise<boolean> {
    console.log('🏥 Performing Validation System Health Check...\n');
    
    let isHealthy = true;
    const backupDir = path.join(process.cwd(), 'scripts', 'backup');
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    for (const file of CRITICAL_FILES) {
        const filePath = path.join(process.cwd(), file.path);
        const backupPath = path.join(process.cwd(), file.recoveryPath);

        // Check if critical file exists
        if (!fs.existsSync(filePath)) {
            console.log(`❌ Critical file missing: ${file.path}`);
            isHealthy = false;

            // Attempt recovery from backup
            if (fs.existsSync(backupPath)) {
                console.log(`🔄 Recovering ${file.path} from backup...`);
                fs.copyFileSync(backupPath, filePath);
                console.log('✅ Recovery successful');
                isHealthy = true;
            }
        } else {
            // Create backup if it doesn't exist
            if (!fs.existsSync(backupPath)) {
                console.log(`📦 Creating backup of ${file.path}`);
                fs.copyFileSync(filePath, backupPath);
            }
        }
    }

    // Check configuration integrity
    try {
        const config = loadConfig();
        if (!config) {
            console.log('❌ Configuration file corrupted');
            isHealthy = false;
        }
    } catch (error) {
        console.log('❌ Error loading configuration');
        isHealthy = false;
    }

    return isHealthy;
}

function checkValidationEvidence(): boolean {
    const today = new Date().toISOString().split('T')[0];
    const evidencePath = path.join('docs', 'validation', 'evidence', `${today}_*.md`);
    
    try {
        const evidenceFiles = execSync(`git ls-files ${evidencePath}`).toString();
        if (!evidenceFiles) {
            console.error('❌ STOP: No validation evidence found for today');
            console.error('Create validation evidence using the template in docs/templates/pre_action_validation.md');
            return false;
        }
        return true;
    } catch (error) {
        console.error('❌ STOP: Error checking validation evidence');
        return false;
    }
}

function validateDocumentation(): boolean {
    let allValid = true;

    for (const check of VALIDATION_CHECKS) {
        if (!fs.existsSync(check.path)) {
            console.error(check.message);
            if (check.required) {
                allValid = false;
            }
        }
    }

    return allValid;
}

function checkCriticalPath(): boolean {
    // Read the comprehensive validation document
    const validationPath = 'docs/validation/2024-12-24_comprehensive_validation.md';
    if (!fs.existsSync(validationPath)) {
        console.error('❌ STOP: Cannot find comprehensive validation document');
        return false;
    }

    const content = fs.readFileSync(validationPath, 'utf8');
    
    // Check for critical sections
    const requiredSections = [
        'Current State Analysis',
        'TypeScript Migration',
        'Critical Path',
        'HIPAA Compliance'
    ];

    for (const section of requiredSections) {
        if (!content.includes(section)) {
            console.error(`❌ STOP: Missing critical section: ${section}`);
            return false;
        }
    }

    return true;
}

// Check if we're modifying validation system itself
function isValidationSystemChange(gitStatus: string): boolean {
    const modifiedFiles = gitStatus.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.trim().split(' ').pop() || '');

    return modifiedFiles.some(file => 
        SELF_MAINTENANCE_PATHS.some(path => file.includes(path))
    );
}

async function main() {
    // Perform health check first
    const isHealthy = await performHealthCheck();
    if (!isHealthy) {
        console.log('\n⚠️ Validation system needs maintenance!');
        console.log('Run: npm run validate:repair\n');
    }

    console.log('🔍 Running Pre-Action Validation Check...\n');

    // Check if we're modifying validation system files
    try {
        const gitStatus = execSync('git status --porcelain').toString();
        if (isValidationSystemChange(gitStatus)) {
            console.log('⚠️ Validation System Maintenance Mode');
            console.log('Validation checks bypassed for validation system changes');
            console.log('Note: Changes to validation system files will be logged\n');
            
            // Log the maintenance activity
            const maintenanceLog = {
                timestamp: new Date().toISOString(),
                user: process.env.USERNAME || 'unknown',
                files: gitStatus.split('\n').filter(line => line.trim().length > 0)
            };
            
            const logPath = path.join('docs', 'validation', 'maintenance_log.json');
            const existingLogs = fs.existsSync(logPath) 
                ? JSON.parse(fs.readFileSync(logPath, 'utf8')) 
                : [];
            
            existingLogs.push(maintenanceLog);
            fs.writeFileSync(logPath, JSON.stringify(existingLogs, null, 2));
            
            return;
        }
    } catch (error) {
        // If git command fails, proceed with normal validation
        console.log('⚠️ Could not check for validation system changes, proceeding with validation');
    }

    // Process command line arguments
    const args = process.argv.slice(2);
    
    // Handle system enable/disable
    if (args.includes('--disable')) {
        const user = args.find(arg => arg.startsWith('--user='))?.split('=')[1] || 'unknown';
        const reason = args.find(arg => arg.startsWith('--reason='))?.split('=')[1] || 'No reason provided';
        disableValidation(user, reason);
        return;
    }

    if (args.includes('--enable')) {
        enableValidation();
        return;
    }

    // Quick override for single commit
    if (args.includes('--quick-override')) {
        quickOverride();
        return;
    }

    // Check for override command
    const overrideArg = args.find(arg => arg.startsWith('--override='));
    
    if (args.includes('--create-override')) {
        const hours = parseInt(args.find(arg => arg.startsWith('--hours='))?.split('=')[1] || '24');
        const reason = args.find(arg => arg.startsWith('--reason='))?.split('=')[1] || 'Emergency override';
        createOverride(hours, reason);
        return;
    }

    // Check override token
    if (overrideArg) {
        const providedToken = overrideArg.split('=')[1];
        const override = loadOverrideConfig();
        
        if (override && override.token === providedToken) {
            console.log('⚠️ VALIDATION OVERRIDE ACTIVE');
            console.log(`Reason: ${override.reason}`);
            console.log(`Expires: ${override.expiry}`);
            console.log('\n⚠️ Please document this override in the project log\n');
            return;
        }
    }

    const checks = [
        { name: 'Documentation Validation', fn: validateDocumentation },
        { name: 'Evidence Check', fn: checkValidationEvidence },
        { name: 'Critical Path Verification', fn: checkCriticalPath }
    ];

    let allPassed = true;

    for (const check of checks) {
        process.stdout.write(`⏳ Running ${check.name}...`);
        const passed = check.fn();
        if (passed) {
            console.log('✅');
        } else {
            console.log('❌');
            allPassed = false;
        }
    }

    if (!allPassed) {
        console.error('\n❌ VALIDATION FAILED');
        console.error('Review the errors above and complete all required validation steps');
        console.error('\nTo create an emergency override:');
        console.error('npm run validate --create-override --hours=24 --reason="Your reason here"');
        process.exit(1);
    }

    console.log('\n✅ VALIDATION PASSED');
    console.log('You may proceed with your changes');
}

main();
