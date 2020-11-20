# aws-tool

Node.js tool for interacting with Amazon AWS.


The following environment variables are required

```
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
```

## deploy.js

Deploy all files in current directory to S3 using

```node deploy <cloudfront-dist-id> <s3-bucket> <deployment-title>```

The default [ACL permissions](https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html) is set to `private`. Specify public read rights using

```node deploy <cloudfront-dist-id> <s3-bucket> <deployment-title> --public```

Additionaly, specify custom Canned ACL permissions using (optional)

```node deploy <cloudfront-dist-id> <s3-bucket> <deployment-title> <canned-acl>```

