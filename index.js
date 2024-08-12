const express = require("express")
const app = express()
let encoder = new TextEncoder();

var githubMiddleware = require('github-webhook-middleware')({
    secret: process.env.secret
  });

app.post('/', githubMiddleware, (request, response) => {
    console.log(request.body)
    response.status(202).send('Accepted');
});

let port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
