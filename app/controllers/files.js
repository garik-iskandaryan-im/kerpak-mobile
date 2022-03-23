const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { NodeHttpHandler } = require("@aws-sdk/node-http-handler");
const { s3: { KEY, SECRET, REGION, BUKET, LOCATION }, imageConfigs: { ALLOWED_MAX_IMAGE_SIZE } } = require('app/settings');
const sharp = require('sharp');
const mime = require('mime');
const log = require('app/helpers/logger');

const CATALOG_IMAGE_OPTIONS = [
    {width: 480, height: 280, qualityValue: [95], imageType: 'mediumImage'},
    {width: 250, height: 250, qualityValue: [90], imageType: 'smallImage'},
];

// S3Client instance
const client = new S3Client({
    credentials: { secretAccessKey: SECRET, accessKeyId:  KEY },
    secretAccessKey: SECRET,
    accessKeyId:  KEY,
    region: REGION,
    sslEnabled: true,
    requestHandler: new NodeHttpHandler({ connectionTimeout: 1000 })
});

const uploadPromise = async ( key, fileContent, ext, imageType = '') => {
    const params = {
        ServerSideEncryption: 'AES256',
        StorageClass: 'STANDARD',
        Bucket: BUKET,
        Key: key,
        Body: fileContent,
        ContentType: mime.getType(ext),
        ACL: 'public-read',
    };

    return new Promise( async (resolve, reject) => {
        const command = new PutObjectCommand(params);
        const data = await client.send(command);
        data.Location = `${LOCATION}/${key}`;
        if (imageType) {
            data[imageType] = true;
        }
        resolve(data);
    });
}

const rotateAndGetImage = async (angle, fileContent) => {
    return {rotatedImage: await sharp(fileContent).rotate(angle).toBuffer()};
}

const coverAndGetImage = async (fileContent, width, height, ext) => {
    if (ext === 'gif') {
        return {coveredImage: await sharp(fileContent, { animated: true }).resize(width, height).toBuffer()};
    } else {
        return {coveredImage: await sharp(fileContent).resize(width, height).toBuffer()};
    }
}

const makeLowQualityAndGetImage = async (image, qualityValue, ext) => {
    if (ext === 'png') {
        return {poorImage: await sharp(image).clone().png({ quality: qualityValue }).toBuffer()};
    } else if (ext === 'jpg' || ext === 'jpeg') {
        return {poorImage: await sharp(image).clone().jpeg({ quality: qualityValue }).toBuffer()};
    } else {
        return {poorImage: image};
    }
}

module.exports.create = async (req, res) => {
    try {

        // Binary data base64
        const fileContent = Buffer.from(req.files.file.data, 'binary');
        const metadata = await sharp(fileContent).metadata();
        if (metadata.size > ALLOWED_MAX_IMAGE_SIZE) {
            return res.status(409).json({ message: 'Failed to upload file. The allowed maximum file size should be 10 MB.' });
        }

        const ext = req.files.file.name.split('.').pop();

        const fileName = new Date().getTime() + '.' + ext;
        const key = 'files/' + fileName;
        // Setting up S3 upload parameters
        const params = {
            ServerSideEncryption: 'AES256',
            StorageClass: 'STANDARD',
            Bucket: BUKET,
            Key: key,
            Body: fileContent,
            ContentType: mime.getType(ext),
            ACL: 'public-read'
        };

        const command = new PutObjectCommand(params);
        const data = await client.send(command);
        data.Location = `${LOCATION}/${key}`;

        data.originalImage = true;
        const keepRotated = req.query.rotate;
        const lowQuality = req.query.lowQuality;
        let promiseList = [];

        try {
            if (keepRotated && keepRotated !== 'false') {
                const {rotatedImage} = await rotateAndGetImage(270, fileContent);
                promiseList.push(uploadPromise(`files/rotated-${fileName}`, rotatedImage, ext));
            }

            if (lowQuality && lowQuality !== 'false') {
                const qualityVal = 60;
                const image = await sharp(fileContent).toBuffer();
                const {poorImage} = await makeLowQualityAndGetImage(image, qualityVal, ext);
                promiseList.push(uploadPromise(`files/updated-${qualityVal}-${fileName}`, poorImage, ext));
            }

            const type = req.query.type;
            let payloadOptions = [];
            if (type === 'catalog') {
                payloadOptions = CATALOG_IMAGE_OPTIONS;
            }
            if (payloadOptions && payloadOptions.length > 0) {
                for(let index in payloadOptions) {
                    const option = payloadOptions[index];
                    const {coveredImage} = await coverAndGetImage(fileContent, option.width, option.height, ext);
                    if (option.qualityValue) {
                        const qualityArray = [].concat(option.qualityValue);
                        for(let qualityIndex in qualityArray) {
                            const {poorImage} = await makeLowQualityAndGetImage(coveredImage, qualityArray[qualityIndex], ext);
                            promiseList.push(uploadPromise(`files/updated-${qualityArray[qualityIndex]}-${option.width}x${option.height}-${fileName}`, poorImage, ext, option.imageType));
                        }
                    } else {
                        return res.send({ "response_code": 200, "response_message": "Success", "response_data": data });
                    }
                }
                await Promise.all(promiseList).then( (result) => {
                    return res.send({ "response_code": 200, "response_message": "Success", "response_data": [...result, data] });
                }).catch ((err) => {
                    return res.status(500).send({ "response_code": 500, "response_message": "Failed", "response_data": err });
                })
            } else {
                return res.send({ "response_code": 200, "response_message": "Success", "response_data": data });
            }
        } catch(err) {
            log.error(err, 'files::controller::create::svg');
            return res.status(500).json({ message: 'Failed to upload file(possibly due to loading svg).' });
        }
    } catch (err) {
        log.error(err, 'files::controller::create');
        return res.status(500).json({ message: 'Failed to upload file' });
    }
};