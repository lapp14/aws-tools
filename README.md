# aws-tool

Node.js tool for interacting with Amazon AWS.

The following environment variables are required

```
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
```

Format js files using `npx prettier --write .`

## deploy.js

Deploy all files in current directory to S3 using the following

`node deploy <s3-bucket> `

<cloudfront-dist-id> 
<deployment-title>

The default [ACL permissions](https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html) is set to `private`. Specify public read rights using `-p`

Add deployment title

`node deploy <s3-bucket> title=deploy-title -p`

Additionaly, specify custom Canned ACL permissions

`node deploy <s3-bucket> acl=canned-acl`

Invalidate cloudfront distributions using

`node deploy <s3-bucket> title=deploy-title cfront=cloudfront-id -p`
