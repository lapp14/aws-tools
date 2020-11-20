

const path = require('path');
const AWS = require('aws-sdk');
const fs = require('fs');
const glob = require('glob');
const mime = require('mime-types');

const BASEPATH = path.join(__dirname, '../');

const _usage = () => {
    console.log('Usage is node deploy <cloudfront-dist-id> <s3-bucket> <deployment-title>');
}

const _walkSync = (dir, filelist = []) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = _walkSync(path.join(dir, file), filelist);
        } else {
            filelist.push(path.join(dir, file));
	}
    });
    return filelist;
};

const getAssetList = async (path) => {
    return _walkSync(path);
}

const getAssets = async (path = '.') => {
    const assets = await getAssetList(path);
    const assetsList = [];
    await Promise.all(assets.map(async (filepath) => {
        if (fs.lstatSync(filepath).isDirectory()) {
            const paths = fs.readdirSync(filepath);
            paths.forEach(file => {
                const contentType = mime.lookup(path.join(BASEPATH, filepath, file))
                if (contentType) {
                    assetsList.push({
                        source: path.join(BASEPATH, filepath, file),
                        destination: pathReplace(path.join(filepath, file)),
                        contentType
                    });
                }                
            });
        } else { 
            const contentType = mime.lookup(path.join(BASEPATH, filepath))
            if (contentType) {
                assetsList.push({
                    source: path.join(BASEPATH, filepath),
                    destination: pathReplace(filepath),
                    contentType
                });
            }
                
        }
    }));
    return assetsList;
};

// windows path fix, replaces backslashes with forward slashes
const pathReplace = path => {
    return path.replace(/\\/g, '/');
}

const uploadFile = async (source, destination, contentType, permissions) => {
    if (!contentType) {
        return;
    }

    console.log(`  - Uploading ${source} to ./${destination} (contentType: ${contentType}, ACL: ${permissions})`);

    return new AWS.S3().upload({
        ACL: permissions,
        Body: fs.createReadStream(source),
        Bucket: s3Bucket,
        ContentType: contentType,
        Key: destination
    }).promise();
};

const uploadAll = async (path, permissions) => {  
    const assets = await getAssets();
    await Promise.all(assets.map(asset => uploadFile(asset.source, asset.destination, asset.contentType, permissions)))
};

const cloudfrontCacheInvalidation = async () => {
    return new AWS.CloudFront().createInvalidation({
        DistributionId: cloudfrontDistributionId,
        InvalidationBatch: {
            CallerReference: `${deploymentTitle}.${new Date().getTime().toString()}`,
            Paths: {
                Quantity: 1,
                Items: ['/*']
            }
        }
    }).promise();
};

const deploy = async () => {
    console.log(process)
    
    const args = process.argv.slice(2);

    args.forEach(arg => {
	keyValue = arg.split('=');

	if 
	switch (keyValue[0]) {

	    case 'cloudfront

            default:
	        throw new Error(_usage());
	}
    });


    const cloudfrontDistributionId = process.argv[2];
    const s3Bucket = process.argv[3];
    const deploymentTitle = process.argv[4]; 

    if (!cloudfrontDistributionId || !s3Bucket || !deploymentTitle) {
        _usage();
        throw new Error('Incorrect usage of deploy.js');
    }

    const permissions = process.argv.length == 5 && process.argv[5] === '--public' ? 'public-read' : process.argv[5] || 'private';

    console.log(`Deplying to S3 bucket: ${s3Bucket}`);
    console.log('....................')
    console.log('Uploading assets...') ;
    console.log(`- Project basepath: ${BASEPATH}`);
    await uploadAll(permissions);
    console.log('Creating invalidation...');
    console.log(`- Cloudfront distribution: ${cloudfrontDistributionId}`);    
    const invalidation = await cloudfrontCacheInvalidation();        
    console.log(`- Invalidation ID: ${invalidation.Invalidation.Id}`);
};

deploy();

