
exports.handler = function(event, context, callback) {
	
	console.log('Start of Lambda funtion execution.');
	
	//Getting AWS SDK object.
	var aws_sdk = require('aws-sdk');
	
	// Getting aws SES service object.
	var ses = new aws_sdk.SES({region: 'us-east-1'});
	
	// Getting AWS DynamoDB service object.
	var dydb = new aws_sdk.DynamoDB();

	// Logging triggering event.
    console.log("Lambda triggered by: ", event);
	
	// Getting message body from the SNS event.
    var sns_msg = event.Records[0].Sns.Message;
	
	// Splitting the message content for the Email creation.
    var message=sns_msg.split("|");
	
	//Getting parameters from sns messgae body.
    var email_to=message[0];
    var domain=message[1];
	var email_from = "no-reply@"+domain;
    var db_name=message[2];
	
	//Setting up password reset link.
    var reset_link="";

	// Quering the DynamoDB for record check!
    var dbQuery = {
      TableName: db_name,
      Key: {
        'id' : {S: email_to}
      },
      ExpressionAttributeNames:{
        "#tt": "Token"
      },
      ProjectionExpression: '#tt'
    };

  dydb.getItem(dbQuery, function(err, data) {
    if (err) {
          console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
      }
      else{
        if(Object.keys(data).length === 0 && data.constructor === Object){
          console.log('Password Reset requested by:', email_to);
		      
		      console.log("Generating New Token!")
		      
		      const ttl = require('uuid/v1');
		      
          console.log("Token Generated: "+ttl());
		  
          var itemParams ={
            TableName: db_name,
            Item:{
              "id":{S:email_to},
              "Token":{S:ttl()}
            }
          };
		  
          dydb.putItem(itemParams, function(err) {
          if(err) console.log(err);
          else{
			  
            reset_link="http://"+domain+"/reset?email="+email_to+"&token="+ttl()+"/";
			
            console.log("reset_link:"+reset_link);
            var ses_data = {
              Destination: {
                  ToAddresses: [email_to]
              },
              Message: {
                  Body: {
                      Html: {
                          Charset: 'UTF-8',
                          Data: '<html><body><b>Hi, Your password reset link:<a href=\"'+reset_link+'" target=\"_blank\">Password Reset Link</a></b></body></html>'
                      }
                  },
                  Subject: {
                      Data: "CSYE6225: Reset your password!"
                  }
              },
              Source: email_from
            };
            var email = ses.sendEmail(ses_data, function(err, data){
                if(err) console.log(err);
                else {
                    console.log("Email sent to user: "+email_to);
					console.log("The email data was: ")
                    console.log(data);
                    context.succeed(event);
                }
            });
          }
        });
      }
      else{
            console.log("The TTL Token is already exists for the user:"+ email_to);
        }
      
  }});
};
