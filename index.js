const express = require("express")
const app = express()
let encoder = new TextEncoder();

var githubMiddleware = require('github-webhook-middleware')({
    secret: process.env.secret
  });

app.post('/', githubMiddleware, (req, response) => {
    if (req.headers['x-github-event'] != 'push') return res.status(200).end();
    response.status(202).send('Accepted');
    console.log(req.body)
});

let port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
