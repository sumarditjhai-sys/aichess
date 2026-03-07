const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");
const { Chess } = require("chess.js");

dotenv.config();
const app = express();
const port = process.env.port || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const chess = new Chess();

app.post("/api/movePiece", async (req, res) => {
    const { move } = req.body;
    if (!move) {
        return res.status(400).send("Please provide a move in the request body.");
    }

    try {
        // Human's move
        if (chess.move(move, { sloppy: true }) === null) {
            return res.status(400).send(`Invalid move: ${move}`);
        }

        if (chess.isGameOver()) {
            return res.json({
                pgn: chess.pgn(),
                fen: chess.fen(),
                gameOver: true,
                turn: chess.turn()
            });
        }

        // AI's turn
        const pgn = chess.pgn();
        let aiMove = null;
        let retries = 0;

        while (retries < 3 && !aiMove) {
            try {
                const config = {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': `${process.env.API_KEY}`
                    }
                };
                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent`,
                    {
                        contents: [
                            {
                                parts: [
                                    {
                                        text: `You are a chess engine playing Black. The current game is: ${pgn}. Provide your next move in standard algebraic notation. Respond ONLY with the move itself, with no punctuation or additional text.`,
                                    },
                                ],
                            },
                        ],
                    }, config
                );

                aiMove = response.data.candidates[0].content.parts[0].text.trim();

                if (chess.move(aiMove, { sloppy: true }) === null) {
                    aiMove = null;
                }

            } catch (error) {
                console.error("Error calling Gemini API:", error.message);
                retries++;
            }
        }

        if (!aiMove) {
            const moves = chess.moves();
            aiMove = moves[0];
            chess.move(aiMove, { sloppy: true });
        }

        res.json({
            pgn: chess.pgn(),
            fen: chess.fen(),
            gameOver: chess.isGameOver(),
            turn: chess.turn()
        });

    } catch (error) {
        res.status(500).send("An error occurred: " + error.message);
    }
});

app.post("/api/validate", (req, res) => {
    const { fen, move } = req.body;
    if (!fen || !move) {
        return res.status(400).send("Please provide a FEN and a move in the request body.");
    }
    const tempChess = new Chess(fen);
    try {
        const result = tempChess.move(move, { sloppy: true });
        res.json({ valid: result !== null });
    } catch (error) {
        res.json({ valid: false });
    }
});


app.get("/api/status", (req, res) => {
    res.json({
        inCheck: chess.inCheck(),
        isCheckmate: chess.isCheckmate(),
        isDraw: chess.isDraw(),
        turn: chess.turn(),
        fen: chess.fen()
    });
});

app.get("/api/reset", (req, res) => {
    chess.reset();
    res.json({
        pgn: chess.pgn(),
        fen: chess.fen(),
        gameOver: false,
        turn: chess.turn()
    });
});


app.listen(port, () => {
    console.log(`server is running on port ${port}`);
})
