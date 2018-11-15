package amazonaws;


import com.amazonaws.regions.Regions;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.SNSEvent;
import com.amazonaws.services.simpleemail.AmazonSimpleEmailService;
import com.amazonaws.services.simpleemail.AmazonSimpleEmailServiceAsyncClientBuilder;
import com.amazonaws.services.simpleemail.model.*;

import java.text.SimpleDateFormat;
import java.time.Instant;
import java.util.Calendar;
import java.util.Optional;
//import java.util.Random;
import java.util.UUID;

public class Lambda implements RequestHandler<SNSEvent, Object> {

	Regions regions = Regions.US_EAST_1;
    DynamoDB dynamo;
    String TableName = "passwordTable";

    public Object handleRequest(SNSEvent request, Context context) {

        String time1 = new SimpleDateFormat("MM-dd-yyyy HH:mm:ss").format(Calendar.getInstance().getTime());
        context.getLogger().log("Lambda function started at: " + time1);
        long TTLTime = Instant.now().getEpochSecond();
        TTLTime = TTLTime + 1200;
        
        
        String info = request.getRecords().get(0).getSNS().getMessage();
        context.getLogger().log("Starting dynamoDB");
        this.initDynamoDB();

        Table table = dynamo.getTable(TableName);
        Optional<Item> item = Optional.ofNullable(table.getItem("id", info));

        //String token = getToken(info, TTLTime);
        String token = UUID.randomUUID().toString();

        if (item.isPresent()) {
        	context.getLogger().log("Record exists");

        } else {
        	context.getLogger().log("Creating password");
            context.getLogger().log("Payload: "+ info + "\tToken: "+ token + "\tEpochTime: "+ TTLTime);

            Item NewItem = new Item().withPrimaryKey("id", info).withString("token", token).withNumber("tokenTTL", TTLTime);
            table.putItem(NewItem);
            context.getLogger().log("Password saved");

            String domain = System.getenv("domainName");

            try {
                String mail = "<p> Password reset request received. Follow the link below to set a new password </p><p> <a href = \"www." + domain + "/reset?token=" + token + "&email=" + info + "\"><button>Reset Password</button></a></p>";
                sendMail(info, "donotreply@" + domain, "Password reset request", mail);
                context.getLogger().log("Password reset link sent");

            } catch (Exception ex) {
                context.getLogger().log("Error: " + ex.toString());
            }

        }
        
        String time2 = new SimpleDateFormat("MM-dd-yyyy HH:mm:ss").format(Calendar.getInstance().getTime());
        context.getLogger().log("Lambda function completed at: " + time2);

        return null;
    }

    
    private void sendMail(String to, String from, String subject, String text) {
    	
        Content bodytxt = new Content().withCharset("UTF-8").withData(text);
        Content subContent = new Content().withCharset("UTF-8").withData(subject);
        
        AmazonSimpleEmailService mailClient = AmazonSimpleEmailServiceAsyncClientBuilder.standard().withRegion(regions).build();
        SendEmailRequest emailRequest = new SendEmailRequest().withDestination(new Destination().withToAddresses(to)).withMessage(new Message().withBody(new Body().withHtml(bodytxt)).withSubject(subContent)).withSource(from);
        mailClient.sendEmail(emailRequest);
        
    }

    private void initDynamoDB() {
        AmazonDynamoDB sender = AmazonDynamoDBClientBuilder.standard().withRegion(regions).build();
        this.dynamo = new DynamoDB(sender);

    }


}