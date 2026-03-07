const board = document.getElementById("board");
const turnDisplay = document.getElementById("turn");
const statusDisplay = document.getElementById("status");
const aiThinkingDisplay = document.getElementById("ai-thinking");
const resetButton = document.getElementById("resetButton");
const modal = document.getElementById("modal");
const modalMessage = document.getElementById("modal-message");
const playAgainButton = document.getElementById("playAgainButton");

resetButton.addEventListener("click", resetGame);
playAgainButton.addEventListener("click", () => {
    resetGame();
    modal.classList.add("hidden");
});


let selectedPiece = null;
let startPosition = null;
let currentFen = null;

function createBoard(fen) {
    currentFen = fen;
    board.innerHTML = "";
    const rows = fen.split(" ")[0].split("/");
    for (let i = 0; i < 8; i++) {
        const row = rows[i];
        let col = 0;
        for (const char of row) {
            if (isNaN(char)) {
                const cell = createCell(i, col);
                const piece = getPieceName(char);
                const pieceElement = createPiece(piece);
                cell.appendChild(pieceElement);
                board.appendChild(cell);
                col++;
            } else {
                for (let j = 0; j < parseInt(char); j++) {
                    const cell = createCell(i, col);
                    board.appendChild(cell);
                    col++;
                }
            }
        }
    }
}

function createCell(row, col) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.dataset.row = row;
    cell.dataset.col = col;
    if ((row + col) % 2 === 0) {
        cell.classList.add("white");
    } else {
        cell.classList.add("black");
    }
    return cell;
}

function getPieceName(fenChar) {
    const pieceMap = {
        "r": "bR", "n": "bN", "b": "bB", "q": "bQ", "k": "bK", "p": "bP",
        "R": "wR", "N": "wN", "B": "wB", "Q": "wQ", "K": "wK", "P": "wP"
    };
    return pieceMap[fenChar];
}

function createPiece(piece) {
    const pieceElement = document.createElement("img");
    pieceElement.src = `img/chesspieces/wikipedia/${piece}.png`;
    pieceElement.classList.add("piece");
    pieceElement.dataset.piece = piece;
    return pieceElement;
}


async function movePiece(start, end) {
    const move = `${getSquare(start.row, start.col)}${getSquare(end.row, end.col)}`;

    const validationResponse = await fetch("/api/validate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ fen: currentFen, move }),
    });

    const { valid } = await validationResponse.json();

    if (!valid) {
        createBoard(currentFen); // Revert to the current state
        if (selectedPiece) {
            selectedPiece.classList.remove("selected");
            selectedPiece = null;
        }
        startPosition = null;
        return;
    }


    // Temporary UI update for responsiveness
    const pieceElement = selectedPiece.querySelector(".piece");
    const targetCell = board.querySelector(`[data-row='${end.row}'][data-col='${end.col}']`);
    if (targetCell.firstChild) {
        targetCell.removeChild(targetCell.firstChild);
    }
    targetCell.appendChild(pieceElement);
    if (selectedPiece) {
        selectedPiece.classList.remove("selected");
        selectedPiece = null;
    }
    startPosition = null;
    aiThinkingDisplay.classList.remove("hidden");
    turnDisplay.textContent = "Turn: Black";


    try {
        const response = await fetch("/api/movePiece", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ move }),
        });

        if (!response.ok) {
            // Revert the temporary move if the server rejects it
            resetGame();
            throw new Error("Invalid move");
        }

        const data = await response.json();
        updateBoard(data);
        checkStatus();


    } catch (error) {
        console.error("Error making move:", error);
        resetGame();
    } finally {
        aiThinkingDisplay.classList.add("hidden");
        turnDisplay.textContent = "Turn: White";
    }
}

function getSquare(row, col) {
    const files = "abcdefgh";
    const ranks = "87654321";
    return `${files[col]}${ranks[row]}`;
}


function updateBoard(data) {
    createBoard(data.fen);
    //turnDisplay.textContent = "Turn: " + (data.turn === "w" ? "White" : "Black");
}

async function checkStatus() {
    try {
        const response = await fetch("/api/status");
        const status = await response.json();

        statusDisplay.textContent = "";
        if (status.inCheck) {
            statusDisplay.textContent = "Check!";
        }

        if (status.isCheckmate) {
            modalMessage.textContent = status.turn === "b" ? "You Win!" : "Checkmate. You Lose!";
            modal.classList.remove("hidden");
        } else if (status.isDraw) {
            modalMessage.textContent = "Game Draw!";
            modal.classList.remove("hidden");
        }
    } catch (error) {
        console.error("Error checking status:", error);
    }
}


async function resetGame() {
    try {
        const response = await fetch("/api/reset");
        const data = await response.json();
        updateBoard(data);
        statusDisplay.textContent = "";
        aiThinkingDisplay.classList.add("hidden");
        turnDisplay.textContent = "Turn: White";
        modal.classList.add("hidden");
    } catch (error) {
        console.error("Error resetting game:", error);
    }
}


board.addEventListener("click", (event) => {
    let target = event.target;
    if (target.classList.contains("piece")) {
        const pieceColor = target.dataset.piece.charAt(0);

        // If clicking on own piece (White), select it
        if (pieceColor === "w") {
            if (selectedPiece) {
                selectedPiece.classList.remove("selected");
            }
            selectedPiece = target.parentElement;
            selectedPiece.classList.add("selected");
            startPosition = {
                row: parseInt(selectedPiece.dataset.row),
                col: parseInt(selectedPiece.dataset.col),
            };
        }
        // If clicking on opponent piece (Black) AND we have a piece selected, try to capture
        else if (selectedPiece && pieceColor === "b") {
            const endPosition = {
                row: parseInt(target.parentElement.dataset.row),
                col: parseInt(target.parentElement.dataset.col),
            };
            movePiece(startPosition, endPosition);
        }
    } else if (target.classList.contains("cell") && selectedPiece) {
        const endPosition = {
            row: parseInt(target.dataset.row),
            col: parseInt(target.dataset.col),
        };
        movePiece(startPosition, endPosition);
    }
});

resetGame();
