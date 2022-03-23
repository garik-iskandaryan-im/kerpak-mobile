const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const decryptStringWithRsaPrivateKey = function(toDecrypt, relativeOrAbsolutePathtoPrivateKey) {
    const absolutePath = path.resolve(relativeOrAbsolutePathtoPrivateKey)
    const privateKey = fs.readFileSync(absolutePath, 'utf8')
    const buffer = Buffer.from(toDecrypt, 'base64')
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey.toString(),
        passphrase: '',
      },
      buffer,
    )
    return decrypted.toString('utf8')
};

module.exports = {
    decryptStringWithRsaPrivateKey: decryptStringWithRsaPrivateKey
}