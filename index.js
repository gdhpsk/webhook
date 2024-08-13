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
    if(body.ref != repo.ref) return;
    let port = repo.port
    repo = repo.name
    await new Promise((resolve, reject) => {
        let cmd = spawn("sudo", ["git", "pull"], {cwd: `/projects/${repo}`})
        cmd.on("exit", () => {
            console.log(`Pulled for ${repo}`)
            resolve("")
        })
    })

    await new Promise((resolve, reject) => {
        let cmd = spawn("sudo", ["npm", "run", "build"], {cwd: `/projects/${repo}`, shell: true})
        cmd.on("exit", () => {
            console.log(`Ran build command for ${repo}`)
            resolve("")
        })
    })

    await new Promise((resolve, reject) => {
        let cmd = spawn("sudo", ["docker", "build", "-t", repo, "."], {cwd: `/projects/${repo}`, shell: true})
        cmd.on("exit", () => {
            console.log(`Built ${repo} with docker`)
            resolve("")
        })
    })
    
    let id = await new Promise((resolve, reject) => {
    let container = spawn("sudo", ["docker", "ps", "|", "grep", `"${port}->${port}"`, "|", "awk", "'{print $1}'"], {shell: true, cwd: "/"})
    container.stdout.on("data", (e) => {
        let container = e.toString().trim()
        resolve(container)
    })
    })

    let command = await new Promise((resolve, reject) => {
        let run_cmd = `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock:ro assaflavie/runlike ${id}`
        let cmd = spawn("sudo", run_cmd.split(" "), {shell: true, cwd: "/"})
        cmd.stdout.on("data", (e) => {
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
