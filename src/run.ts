import { start } from "serendip";
import { AuthService } from "./services/AuthService";
import { HttpClientService } from "./services/HttpClientService";

start({
  services: [AuthService, HttpClientService],
  httpPort: null,
  cpuCores: 1
})
  .then(() => {
    console.log("Server workers started successfully!");
  })
  .catch(err => {
    console.error("\nServer start error \n");
    console.error(err);
    process.exit();
  });
