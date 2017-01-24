const dns = require("dns");
const net = require("net");
const assert = require("assert");
const Logger = require("nice-logger");
const log = new Logger("mailer", "debug");


function Mailer(domain, options) {

    function resolveTransferHost(to) {
        return new Promise(function(resolve, reject) {
            const mailDomain = to.split("@")[1];
            if (!mailDomain) {
                reject(new Error("Invalid email address: " + to));
            }
            dns.resolveMx(mailDomain, function(err, addresses) {
                if (err) {
                    reject(err);
                }
                if (addresses.length === 0) {
                    reject(new Error("No addresses found for domain " + mailDomain));
                }
                log.debug(addresses);
                addresses.sort(function(a,b) { return a.priority - b.priority; });
                resolve(addresses[0].exchange);
            });
        })
    }

    function objToHeaders(headers) {
        let result = [];
        for (let i=0, keys=Object.keys(headers), len=keys.length; i<len; i++) {
            result.push(keys[i] + ": " + headers[keys[i]]);
        }
        return result.join("\r\n");
    }

    function fillHeaders(msg) {
        if (!msg.headers["Date"]) {
            msg.headers["Date"] = (new Date).toISOString();
        }
        if (!msg.headers["From"]) {
            msg.headers["From"] = msg.from;
        }
        if (!msg.headers["To"]) {
            msg.headers["To"] = msg.to;
        }
    }

    function send(msg) {
        return resolveTransferHost(msg.to)
        .then(function(mta) {
            const client = net.connect({
                port: 25,
                host: mta,
            }, function() {
                log.info("Listening.");
            });
            fillHeaders(msg);
            const queue = [
                "HELO " + domain,
                "MAIL FROM:<"+msg.from+">",
                "RCPT TO:<"+msg.to+">",
                "DATA",
                objToHeaders(msg.headers) + "\r\n\r\n" + msg.body + "\r\n.",
                "QUIT",
            ];
            let qi = 0;
            client.on("data", function(data) {
                log.debug(data.toString().trim());
                log.debug(queue[qi]);
                client.write(queue[qi] + "\r\n");
                qi += 1;
            });
            return client;
        })
        .then(function(client) {
            return new Promise(function(resolve, reject) {
                client.on("end", function() {
                    log.info("Disconnected.");
                    resolve(client);
                });
                client.on("error", reject);
            });
        })
        .catch(function(err) {
            log.error(err);
        });
    }

    this.send = send;

}


module.exports = Mailer;
