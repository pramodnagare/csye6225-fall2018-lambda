console.log('Loading updated function');
var aws = require('aws-sdk');
var ses = new aws.SES({
   region: 'us-east-1'
});
var ddb = new aws.DynamoDB();

exports.handler = function(event, context, callback) {
    console.log("Incoming: ", event);
    var msgRaw = event.Records[0].Sns.Message;
    console.log(msgRaw);
    var msgArr=msgRaw.split("|");
    var useremail=msgArr[0];
    var Src=msgArr[1];
    var DdbTable=msgArr[2];
    var url=msgArr[3];
    console.log(useremail);
    var qParams = {
      TableName: DdbTable,
      Key: {
        'id' : {S: useremail}
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
          console.log(data);
          console.log("New token generated");
          console.log('Hello, Message received from SNS:', useremail);

          console.log('===SENDING EMAIL===');
          var currDate=new Date();
          console.log("curr:"+currDate);
          console.log("currs:"+Math.floor(currDate.getTime()/1000));
          var ttl=Math.floor(currDate.setMinutes(currDate.getMinutes() + 20)/1000);
          console.log("ttl:"+ttl);
          var itemParams ={
            TableName: DdbTable,
            Item:{
              "id":{S:useremail},
              "ttl":{N:ttl.toString()}
            }
          };
          ddb.putItem(itemParams, function(err) {
          if(err) console.log(err);
          else{
            url=url+"/reset?email="+useremail+"&token="+ttl.toString();
            console.log("url:"+url);
            var eParams = {
              Destination: {
                  ToAddresses: [useremail]
              },
              Message: {
                  Body: {
                      Html: {
                          Charset: 'UTF-8',
                          Data: '<html><body><b>Click Here:<a href=\"http://'+url+'\" target=\"_blank\">Reset Link</a></b></body></html>'
                      }
                  },
                  Subject: {
                      Data: "WebApp: Your reset password link is here!"
                  }
              },
              Source: Src
            };
            var email = ses.sendEmail(eParams, function(err, data){
                if(err) console.log(err);
                else {
                    console.log("===EMAIL SENT===");
                    console.log(data);

                    console.log("EMAIL CODE END");
                    console.log('EMAIL: ', email);
                    context.succeed(event);
                }
            });
          }
        });
      }
      else{
            console.log("Token already exist.");
            console.log(data);
            var tkn_ttl=parseInt((JSON.stringify(data.Item.ttl.N)).replace('\"',''));
            console.log("tkn_ttl:"+tkn_ttl);
            var currDate=new Date();
            var curr_ttl=Math.floor(currDate.getTime()/1000);
            console.log("curr_ttl:"+curr_ttl);
            console.log("diff:"+(curr_ttl-tkn_ttl))
            if((curr_ttl-tkn_ttl)>0)
            {
              console.log(data);
              console.log("New token updated");
              console.log('Hello, Message received from SNS:', useremail);
              console.log('===SENDING EMAIL===');
              var currDate=new Date();
              console.log("curr:"+currDate);
              var ttl=Math.floor(currDate.setMinutes(currDate.getMinutes() + 20)/1000);
              console.log("ttl:"+ttl);
              var itemParams ={
                TableName: DdbTable,
                Item:{
                  "id":{S:useremail},
                  "ttl":{N:ttl.toString()}
                }
              };
              ddb.putItem(itemParams, function(err) {
              if(err) console.log(err);
              else{
                 url=url+"/reset?email="+useremail+"&token="+ttl.toString();
                 console.log("url:"+url);
                  var eParams = {
                    Destination: {
                        ToAddresses: [useremail]
                    },
                    Message: {
                        Body: {
                            Html: {
                                Charset: 'UTF-8',
                                Data: '<html><body><b>Click Here:<a href=\"http://'+url+'\" target=\"_blank\">Reset Link</a></b></body></html>'
                            }
                        },
                        Subject: {
                            Data: "WebApp: Your reset password link is here!"
                        }
                    },
                    Source: Src
                };
                console.log("EMAIL CODE END");
                var email = ses.sendEmail(eParams, function(err, data){
                  
                    
                    if(err) console.log(err);
                    else {
                        console.log("===EMAIL SENT===");
                        console.log(data);

                        console.log("EMAIL CODE END");
                        console.log('EMAIL: ', email);
                        context.succeed(event);
                    }
                });
              }
            });
          }
        }
      }
  });

//    callback(null, "Success");
}
