const assert = require("assert");
const Mailer = require("../mailer.js");

describe("Mailer", function() {
    const mailer = new Mailer("foo.bar.com");
    describe("#send", function() {
        it("should send an email!", function() {
            return mailer.send({
                from: "me@foo.bar.com",
                to: "alcorn@flux.io",
                headers: {
                    Subject: "Test",
                },
                body: "This is a test.",
            });
        });
    });
});
