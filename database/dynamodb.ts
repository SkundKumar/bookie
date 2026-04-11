import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.UPLOAD_AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.UPLOAD_AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.UPLOAD_AWS_SECRET_ACCESS_KEY as string,
  },
});

export const docClient = DynamoDBDocumentClient.from(client);
