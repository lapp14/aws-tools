const path = require('path');
const AWS = require('aws-sdk');
const fs = require('fs');
const glob = require('glob');
const mime = require('mime-types');

const BASEPATH = path.join(__dirname, '../');

const _usage = () => {
  console.log('Usage is node deploy s3Bucket [ -p, acl=, cfront=, title= ]');
};

const _walkSync = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
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
};

const getAssets = async (path = '.') => {
  const assets = await getAssetList(path);
  const assetsList = [];
  await Promise.all(
    assets.map(async (filepath) => {
      if (fs.lstatSync(filepath).isDirectory()) {
        const paths = fs.readdirSync(filepath);
        paths.forEach((file) => {
          const contentType = mime.lookup(path.join(BASEPATH, filepath, file));
          if (contentType) {
            assetsList.push({
              source: path.join(BASEPATH, filepath, file),
              destination: pathReplace(path.join(filepath, file)),
              contentType,
            });
          }
        });
      } else {
        const contentType = mime.lookup(path.join(BASEPATH, filepath));
        if (contentType) {
          assetsList.push({
            source: path.join(BASEPATH, filepath),
            destination: pathReplace(filepath),
            contentType,
          });
        }
      }
    })
  );
  return assetsList;
};

// windows path fix, replaces backslashes with forward slashes
const pathReplace = (path) => {
  return path.replace(/\\/g, '/');
};

const uploadFile = async (source, destination, contentType, permissions) => {
  if (!contentType) {
    return;
  }

  console.log(
    `  - Uploading ${source} to ./${destination} (contentType: ${contentType}, ACL: ${permissions})`
  );

  return new AWS.S3()
    .upload({
      ACL: permissions,
      Body: fs.createReadStream(source),
      Bucket: s3Bucket,
      ContentType: contentType,
      Key: destination,
    })
    .promise();
};

const uploadAll = async (args) => {
  const permissions = args.isPublic ? 'public-read' : args.acl || 'private';
  const assets = await getAssets();
  await Promise.all(
    assets.map((asset) =>
      uploadFile(
        asset.source,
        asset.destination,
        asset.contentType,
        permissions
      )
    )
  );
};

const cloudfrontCacheInvalidation = async () => {
  return new AWS.CloudFront()
    .createInvalidation({
      DistributionId: cloudfrontDistributionId,
      InvalidationBatch: {
        CallerReference: `${deploymentTitle}.${new Date()
          .getTime()
          .toString()}`,
        Paths: {
          Quantity: 1,
          Items: ['/*'],
        },
      },
    })
    .promise();
};

const deploy = async () => {
  console.log(process);

  const args = process.argv.slice(2);
  const data = {};

  const bucket = args.shift();

  args.forEach((arg) => {
    keyValue = arg.split('=');

    switch (keyValue[0]) {
      case 'cfront':
        data.cloudfrontId = keyValue[1];
        break;

      case 'bucket':
        data.s3Bucket = keyValue[1];
        break;

      case 'title':
        data.title = keyValue[1];
        break;

      case 'acl':
        data.acl = keyValue[1];
        break;

      case '-p':
        data.isPublic = true;
        break;

      default:
        throw new Error(_usage());
    }
  });

  if (!data.s3Bucket) {
    _usage();
    throw new Error('Incorrect usage of deploy.js');
  }

  if (data.isPublic && data.acl) {
    _usage();
    throw new Error(
      'Incorrect usage of deploy.js, cant use both -p flag and acl param'
    );
  }

  console.log(`Deplying to S3 bucket: ${data.s3Bucket}`);
  console.log('....................');
  console.log('Uploading assets...');
  console.log(`- Project basepath: ${BASEPATH}`);

  await uploadAll(data);

  if (data.cloudfrontId) {
    console.log('Creating invalidation...');
    console.log(`- Cloudfront distribution: ${data.cloudfrontDistributionId}`);
    const invalidation = await cloudfrontCacheInvalidation();
    console.log(`- Invalidation ID: ${invalidation.Invalidation.Id}`);
  }

  console.log('Upload complete.');
};

deploy();
