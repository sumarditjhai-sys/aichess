const request = require("supertest");
const nock = require("nock");
const app = require("../server");

describe("Game API", () => {
    beforeEach(() => {
        nock.cleanAll();
        return request(app).get("/api/reset");
    });

    it("should simulate one turn correctly", async () => {
        const geminiMock = nock("https://generativelanguage.googleapis.com")
            .post("/v1beta/models/gemini-3.1-flash-lite-preview:generateContent")
            .reply(200, {
                candidates: [{ content: { parts: [{ text: "e5" }] } }],
            });

        const response = await request(app)
            .post("/api/movePiece")
            .send({ move: "e4" });

        expect(response.status).toBe(200);
        expect(response.body.fen).not.toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        expect(response.body.turn).toBe("w");
        expect(geminiMock.isDone()).toBe(true);
    });

    it("should simulate two turns correctly", async () => {
        const geminiMock1 = nock("https://generativelanguage.googleapis.com")
            .post("/v1beta/models/gemini-3.1-flash-lite-preview:generateContent")
            .reply(200, {
                candidates: [{ content: { parts: [{ text: "e5" }] } }],
            });

        await request(app).post("/api/movePiece").send({ move: "e4" });

        const geminiMock2 = nock("https://generativelanguage.googleapis.com")
            .post("/v1beta/models/gemini-3.1-flash-lite-preview:generateContent")
            .reply(200, {
                candidates: [{ content: { parts: [{ text: "Nf6" }] } }],
            });

        const response = await request(app)
            .post("/api/movePiece")
            .send({ move: "Nf3" });

        expect(response.status).toBe(200);
        expect(response.body.turn).toBe("w");
        expect(geminiMock1.isDone()).toBe(true);
        expect(geminiMock2.isDone()).toBe(true);
    });

    it("should simulate three turns correctly", async () => {
        const geminiMock1 = nock("https://generativelanguage.googleapis.com")
            .post("/v1beta/models/gemini-3.1-flash-lite-preview:generateContent")
            .reply(200, {
                candidates: [{ content: { parts: [{ text: "e5" }] } }],
            });
        await request(app).post("/api/movePiece").send({ move: "e4" });

        const geminiMock2 = nock("https://generativelanguage.googleapis.com")
            .post("/v1beta/models/gemini-3.1-flash-lite-preview:generateContent")
            .reply(200, {
                candidates: [{ content: { parts: [{ text: "Nf6" }] } }],
            });
        await request(app).post("/api/movePiece").send({ move: "Nf3" });

        const geminiMock3 = nock("https://generativelanguage.googleapis.com")
            .post("/v1beta/models/gemini-3.1-flash-lite-preview:generateContent")
            .reply(200, {
                candidates: [{ content: { parts: [{ text: "d5" }] } }],
            });
        const response = await request(app)
            .post("/api/movePiece")
            .send({ move: "d4" });

        expect(response.status).toBe(200);
        expect(response.body.turn).toBe("w");
        expect(geminiMock1.isDone()).toBe(true);
        expect(geminiMock2.isDone()).toBe(true);
        expect(geminiMock3.isDone()).toBe(true);
    });

    it("should handle checkmate correctly", async () => {
        // Scholar's Mate
        const geminiMock1 = nock("https://generativelanguage.googleapis.com")
            .post("/v1beta/models/gemini-3.1-flash-lite-preview:generateContent")
            .reply(200, {
                candidates: [{ content: { parts: [{ text: "e5" }] } }],
            });
        await request(app).post("/api/movePiece").send({ move: "e4" });

        const geminiMock2 = nock("https://generativelanguage.googleapis.com")
            .post("/v1beta/models/gemini-3.1-flash-lite-preview:generateContent")
            .reply(200, {
                candidates: [{ content: { parts: [{ text: "Nc6" }] } }],
            });
        await request(app).post("/api/movePiece").send({ move: "Bc4" });

        const geminiMock3 = nock("https://generativelanguage.googleapis.com")
            .post("/v1beta/models/gemini-3.1-flash-lite-preview:generateContent")
            .reply(200, {
                candidates: [{ content: { parts: [{ text: "Nf6" }] } }],
            });
        await request(app).post("/api/movePiece").send({ move: "Qh5" });

        const response = await request(app)
            .post("/api/movePiece")
            .send({ move: "Qxf7" });

        expect(response.status).toBe(200);
        expect(response.body.gameOver).toBe(true);
        expect(geminiMock1.isDone()).toBe(true);
        expect(geminiMock2.isDone()).toBe(true);
        expect(geminiMock3.isDone()).toBe(true);
    });
});
