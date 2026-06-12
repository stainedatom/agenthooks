import { MongoClient } from "mongodb";
import { config } from "./config";

const mongoclient = new MongoClient(config.mongodbUri, { ignoreUndefined: true });

export default mongoclient;