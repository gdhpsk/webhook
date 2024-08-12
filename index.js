const express = require("express")
const app = express()
let encoder = new TextEncoder();

async function verifySignature(secret, header, payload) {
    try {
        let parts = header.split("=");
        let sigHex = parts[1];

        let algorithm = { name: "HMAC", hash: { name: 'SHA-256' } };

        let keyBytes = encoder.encode(secret);
        let extractable = false;
        let key = await crypto.subtle.importKey(
            "raw",
            keyBytes,
            algorithm,
            extractable,
            ["sign", "verify"],
        );

        let sigBytes = hexToBytes(sigHex);
        let dataBytes = encoder.encode(payload);
        let equal = await crypto.subtle.verify(
            algorithm.name,
            key,
            sigBytes,
            dataBytes,
        );

        return equal;
    } catch (_) {
        console.log(_)
        return false
    }
}

function hexToBytes(hex) {
    let len = hex.length / 2;
    let bytes = new Uint8Array(len);

    let index = 0;
    for (let i = 0; i < hex.length; i += 2) {
        let c = hex.slice(i, i + 2);
        let b = parseInt(c, 16); 
        bytes[index] = b;
        index += 1;
    }

    return bytes;
};

// app.use(express.json({ type: 'application/json' }))

app.post('/', async (req, res, next) => {
    let verified = await verifySignature(process.env.secret, req.headers["x-hub-signature-256"], req.body)
    console.log(req, verified)
    if (!verified) return res.status(401).send("Unauthorized");
    return next()
}, (request, response) => {
    console.log(request.body)
    response.status(202).send('Accepted');
});

let port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
