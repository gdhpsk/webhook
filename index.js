const express = require("express")
const app = express()
let repositories = require("./repositories.json");
const { spawn } = require("child_process");

var githubMiddleware = require('github-webhook-middleware')({
    secret: process.env.secret
  });

app.post('/', githubMiddleware, async (req, response) => {
    if (req.headers['x-github-event'] != 'push') return res.status(200).end();
    response.status(202).send('Accepted');
    let {body} = req
    let repo = repositories[body?.repository?.id?.toString() || ""]
    if(!repo) return;
    await new Promise((resolve, reject) => {
        let cmd = spawn("sudo", ["git", "pull"], {cwd: `/projects/${repo}`})
        cmd.on("exit", () => {
            console.log(`Pulled for ${repo}`)
            resolve("")
        })
    })
    await new Promise((resolve, reject) => {
        let cmd = spawn("sudo", ["docker", "build", "-t", repo, "."], {cwd: `/projects/${repo}`, shell: true})
        cmd.on("exit", () => {
            console.log(`Built ${repo}`)
            resolve("")
        })
    })
    
    let id = await new Promise((resolve, reject) => {
        let container_cmd = `docker ps | grep "${repo}" | awk '{print $1}'`
    let container = spawn("sudo", container_cmd.split(" "), {shell: true, cwd: "/"})
    container.once("message", (e) => {
        let container = e.toString().trim()
        resolve(container)
    })
    })

    let command = await new Promise((resolve, reject) => {
        let run_cmd = `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock:ro assaflavie/runlike ${id}`
        let cmd = spawn("sudo", run_cmd.split(" "), {shell: true, cwd: "/"})
        cmd.once("message", (e) => {
            let cmd = e.toString().trim()
            resolve(cmd)
        })
    })

    let deploy = `docker stop ${id}; sudo docker remove ${id}; sudo ${command}`
    let cmd = spawn("sudo", deploy.split(" "), {shell: true, cwd: "/"})
    cmd.once("exit", (e) => {
        console.log(`Successfully deployed ${repo}`)
    })
});

let port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
