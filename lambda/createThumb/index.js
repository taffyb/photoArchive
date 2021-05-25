// dependencies
const AWS = require('aws-sdk');
const util = require('util');
const sharp = require('sharp');

// get reference to S3 client
const s3 = new AWS.S3();

exports.handler = async (event, context, callback) => {
  var snsMsgString = JSON.stringify(event.Records[0].Sns.Message);
  var snsMsgObject = getSNSMessageObject(snsMsgString);
  // Read options from the event parameter.
  console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
  var srcBucket = snsMsgObject.Records[0].s3.bucket.name;
  var srcKey = snsMsgObject.Records[0].s3.object.key;
  const dstBucket = srcBucket + "-thumbs";
  const dstKey    = "resized-" + srcKey;

  // Infer the image type from the file suffix.
  const typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
      console.log("Could not determine the image type.");
      return;
  }

  // Check that the image type is supported  
  const imageType = typeMatch[1].toLowerCase();
  if (imageType != "jpg" && imageType != "png") {
      console.log(`Unsupported image type: ${imageType}`);
      return;
  }
  console.log(`Image type supported: ${imageType}`);

  // Download the image from the S3 source bucket. 

  try {
      const params = {
          Bucket: srcBucket,
          Key: srcKey
      };
      var origimage = await s3.getObject(params).promise();
      console.log(`origimage retrieved: ${JSON.stringify(params,null,2)}`);
  } catch (error) {
      console.log(error);
      return;
  }  

  // set thumbnail width. Resize will set the height automatically to maintain aspect ratio.
  const width  = 200;

  // Use the sharp module to resize the image and save in a buffer.
  try { 
      var buffer = await sharp(origimage.Body).resize(width).toBuffer();
      console.log(`origimage resized and written to buffer.`);
          
  } catch (error) {
      console.log(error);
      return;
  } 

  // Upload the thumbnail image to the destination bucket
  try {
      const destparams = {
          Bucket: dstBucket,
          Key: dstKey,
          Body: buffer,
          ContentType: "image"
      };

      const putResult = await s3.putObject(destparams).promise(); 
      
  } catch (error) {
      console.log(error);
      return;
  } 
      
  console.log('Successfully resized ' + srcBucket + '/' + srcKey +
      ' and uploaded to ' + dstBucket + '/' + dstKey); 
};
function getSNSMessageObject(msgString) {
    var x = msgString.replace(/\\/g,'');
    var y = x.substring(1,x.length-1);
    var z = JSON.parse(y);
    
    return z;
 }            