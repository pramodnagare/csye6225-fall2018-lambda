//Getting AWS SDK object.
var aws = require('aws-sdk');

// Getting aws SES service object.
var ses = new aws.SES({
   region: 'us-east-1'
});

// Getting AWS DynamoDB service object.
var ddb = new aws.DynamoDB();

exports.handler = function(event, context, callback) {
    console.log("Lambda Triggered by event: ", event);
    var sns_msg = event.Records[0].Sns.Message;
    console.log(sns_msg);
    var msg_body=sns_msg.split("|");
    var email_to=msg_body[0];
    var email_from=msg_body[1];
    email_from = "no-reply@"+email_from;
    var dynamo_db=msg_body[2];
    var reset_link=msg_body[1];
    console.log(email_to);
    var qParams = {
      TableName: dynamo_db,
      Key: {
        'id' : {S: email_to}
      },
      ExpressionAttributeNames:{
        "#tt": "ttl"
      },
      ProjectionExpression: '#tt'
    };

  ddb.getItem(qParams, function(err, data) {
      if (err) {
          console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
      } else {
        if(Object.keys(data).length === 0 && data.constructor === Object)
        {
          console.log('Password reset request has been initiated by user: ', email_to);
          
          const ttl = require('uuid/v1');
		      
		      var ttl_new = ttl();
		      
          console.log("Token Generated: "+ttl_new);
          
          console.log("ttl:"+ttl_new);
          var itemParams ={
            TableName: dynamo_db,
            Item:{
              "id":{S:email_to},
              "Token":{S:ttl_new}
            }
          };
          ddb.putItem(itemParams, function(err) {
          if(err) console.log(err);
          else{
            reset_link=reset_link+"/reset?email="+email_to+"&token="+ttl_new;
            console.log("reset_link:"+reset_link);
            var eParams = {
              Destination: {
                  ToAddresses: [email_to]
              },
              Message: {
                  Body: {
                      Html: {
                          Charset: 'UTF-8',
                          Data: '<html><body><b>Hi, Your password reset link:<a href=\"'+reset_link+'" target=\"_blank\">Password_Reset_Link</a></b></body></html>'
                      }
                  },
                  Subject: {
                      Data: "CSYE6225: Reset your password!!"
                  }
              },
              Source: email_from
            };
            var email = ses.sendEmail(eParams, function(err, data){
                if(err) console.log(err);
                else {
                    console.log("Sending Email to user: ");
                    console.log("Email Data: " , email);
					console.log("Email sent successfully!")
                    context.succeed(event);
                }
            });
          }
        });
      }
      else
		  console.log("The user has already requested for password reset as the TTL token exists in the system.");
      }
  });
}
