const dns = require("dns");
const net = require("net");
const assert = require("assert");

const mailDomain = "flux.io";
const from = "me@foo.bar.com";
const to = "alcorn@flux.io";
const mail = [
    "From: <"+from+">",
    "Date: " + (new Date()).toUTCString(),
    "To: <"+to+">",
    "Subject: Test",
    "",
    "This message is a test.",
];

const p = new Promise(function(resolve, reject) {
    const mailDomain = to.split("@")[1];
    if (!mailDomain) {
        throw new Error("Invalid email address: " + to);
    }
    dns.resolveMx(mailDomain, function(err, addresses) {
        if (err) {
            throw err;
        }
        if (addresses.length === 0) {
            throw new Error("No addresses found for domain " + mailDomain);
        }
        console.log(addresses);
        addresses.sort(function(a,b) { return a.priority - b.priority; });
        resolve(addresses[0].exchange);
    });
})
.then(function(mta) {
    const client = net.connect({
        port: 25,
        host: mta,
    }, function() {
        console.log("Listening.");
    });
    const queue = [
        "HELO foo.bar.com",
        "MAIL FROM:<"+from+">",
        "RCPT TO:<"+to+">",
        "DATA",
        mail,
        "QUIT",
    ];
    let qi = 0;
    client.on("data", function(data) {
        console.log(data.toString().trim());
        if (qi < queue.length) {
            if (Array.isArray(queue[qi])) {
                for (let i=0, len=queue[qi].length; i<len; i++) {
                    console.log(queue[qi][i]);
                    client.write(queue[qi][i] + "\r\n");
                }
                client.write("\r\n.\r\n");
            } else {
                console.log(queue[qi]);
                client.write(queue[qi] + "\r\n");
            }
        }
        qi += 1;
    });
    client.on("end", function() {
        console.log("Disconnected.");
    });
    return client;
})
.catch(function(err) {
    console.log(err);
});
