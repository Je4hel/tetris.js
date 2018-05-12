const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");

/**
 * Scale applied to the canvas
 */
const canvasScale = 30;

const colors = [
    null,
    "#e57373",
    "#ba68c8",
    "#64b5f6",
    "#81c784",
    "#fff176",
    "#ff8a65",
    "#90a4ae"
]

context.scale(canvasScale, canvasScale);

/**
 * Last time (ms) the current tetromino was dropped and drawn
 */
let lastDropTime = -1;

/**
 * Interval at which the current tetromino is drawn
 */
const dropInterval = 1000;

/**
 * Game arena containing the tetrominoes
 */
const arena = {
    sprite: createMatrix(12, 20),
    width: 12,
    height: 20
};

/**
 * Current player state
 */
const player = {
    score: 0,
    lastRowSweepWasTetris: false,
    sprite: null,
    position: { x: 0, y: 0 }
};

/**
 * Update the canvas with the current state of the game
 * @param {Number} time The current time given by performance.now()
 */
function update(time = 0) {
    context.fillStyle = "#102027";
    context.fillRect(0, 0, canvas.width, canvas.height);

    let deltaTime = time - lastDropTime;
    if (deltaTime >= dropInterval) {
        dropTetromino();
    }

    draw();
    requestAnimationFrame(update);
}

/**
 * Draw the current tetromino on the canvas
 */
function draw() {
    drawMatrix(arena.sprite);
    drawMatrix(player.sprite, player.position);
}

function sweepArena() {
    let rowClearings = 0;

    for (let y = arena.height - 1; y >= 0; y--) {
        if (arena.sprite[y].findIndex(v => v === 0) < 0) {
            const row = arena.sprite.splice(y, 1)[0];
            arena.sprite.unshift(row.fill(0)); // splice returns the removed row, so we reuse it instead of creating another array
            y++; // We essentially moved all of the rows down, so we need to compensate the next y-- of the for loop not to skip the next row

            rowClearings++;
        }
    }

    // Score management
    if (rowClearings === 4) {
        // One tetris is awarded 800 points
        // Two consecutive tetrises are awarded 1200 each, so 400 to boost the last tetris reward + 1200 for this tetris
        player.score += player.lastRowSweepWasTetris ? 1600 : 800;

        // Avoid chaining double tetrises
        player.lastRowSweepWasTetris = !player.lastRowSweepWasTetris;
    }
    else {
        player.score += rowClearings * 100;
        player.lastRowSweepWasTetris = false;
    }

    updateScore();
}

/**
 * Create a matrix of the specified size
 * @param {Number} width Width of the matrix
 * @param {Number} height Height of the matrix
 * @param {any} filler Filler of the matrix, defaults to 0 
 */
function createMatrix(width, height, filler = 0) {
    const matrix = [];
    while (height--) {
        matrix.push(new Array(width).fill(filler));
    }

    return matrix;
}

/**
 * Draw a matrix on the canvas
 * @param {Number[][]} matrix Matrix to draw on the canvas
 * @param {{x: Number, y: Number}} offset Offset from the canvas origin, defaults to (0, 0)
 */
function drawMatrix(matrix, offset = { x: 0, y: 0 }) {
    matrix.forEach((row, relativeY) => {
        row.forEach((value, relativeX) => {
            if (value !== 0) {
                context.fillStyle = colors[value];
                context.fillRect(relativeX + offset.x, relativeY + offset.y, 1, 1);
            }
        });
    });
}

/**
 * Check if a tetromino is colliding with the arena
 * @param {Number[][]} arena The arena in which the collision is checked
 * @param {{ sprite: Number[][], position: { x: Number, y: Number } }} tetromino The tetromino with which the collision is checked
 * @returns {Boolean} True if the tetromino is colliding the arena or if it is outside its boudaries, false if they don't collide while the tetromino is within the arena boudaries 
 */
function isColliding(arena, tetromino) {
    for (let y = 0; y < tetromino.sprite.length; y++) {
        for (let x = 0; x < tetromino.sprite[y].length; x++) {
            if (tetromino.sprite[y][x] !== 0 && (arena[y + tetromino.position.y] && arena[y + tetromino.position.y][x + tetromino.position.x]) !== 0) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Merge a tetromino into the arena
 * @param {Number[][]} arena The arena into which the tetromino will be merged
 * @param {{sprite: Number[][], position: { x: Number, y: Number }} tetromino The tetromino to merge into the arena
 */
function mergeMatrices(arena, tetromino) {
    tetromino.sprite.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[tetromino.position.y + y][tetromino.position.x + x] = value;
            }
        });
    });
}

/**
 * Rotate a sprite in-place
 * @param {Number[][]} sprite The sprite to rotate
 * @param {Number} direction The direction of the rotation: positive for clockwise, negative for counter-clockwise
 */
function rotateMatrix(sprite, direction) {
    // A matrix rotation is a transposition + reversion
    // First we get the transposed matrix
    for (let y = 0; y < sprite.length; y++) {
        for (let x = 0; x < y; x++) {
            [
                sprite[x][y],
                sprite[y][x]
            ] = [
                    sprite[y][x],
                    sprite[x][y]
                ]
        }
    }

    // If we rotate clockwise, we just reverse inside the rows
    if (direction > 0) {
        sprite.forEach(row => row.reverse());
    }
    // If we rotate counter-clockwise, we reverse the rows themselves
    else {
        sprite.reverse();
    }
}

/**
 * Drop the tetromino one row down while handling collision
 * If the tetromino crosses the arena bottom boundary, it is merged in it and the tetromino position is reset to row 0, same X.
 */
function dropTetromino() {
    player.position.y++;
    lastDropTime = performance.now();

    if (isColliding(arena.sprite, player)) {
        player.position.y--;
        mergeMatrices(arena.sprite, player);
        sweepArena();

        resetPlayerSprite();
    }
}

/**
 * Reset the player sprite to a random tetromino and its position to (0, <horizontal center>)
 */
function resetPlayerSprite() {
    const pieces = "IJLOSTZ";
    player.sprite = createTetrominoSprite(pieces[pieces.length * Math.random() | 0]);
    player.position = {
        x: (arena.width / 2 | 0) - (player.sprite[0].length / 2 | 0),
        y: 0
    };

    if (isColliding(arena.sprite, player)) {
        gameOver();
    }
}

function gameOver() {
    arena.sprite.forEach(row => row.fill(0));
    player.score = 0;

    updateScore();
}

/**
 * Get a new sprite of the specified shape
 * @param {string} type Shape of the tetromino (I, J, L, O, S, T or Z)
 * @returns {Number[][]} The tetromino sprite
 */
function createTetrominoSprite(type) {
    switch (type) {
        case "I":
            return [
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0]
            ]
        case "J":
            return [
                [0, 2, 0],
                [0, 2, 0],
                [2, 2, 0]
            ];
        case "L":
            return [
                [0, 3, 0],
                [0, 3, 0],
                [0, 3, 3]
            ];
        case "O":
            return [
                [4, 4],
                [4, 4]
            ];
        case "S":
            return [
                [0, 5, 5],
                [5, 5, 0],
                [0, 0, 0]
            ];
        case "T":
            return [
                [6, 6, 6],
                [0, 6, 0],
                [0, 0, 0]
            ];
        case "Z":
            return [
                [7, 7, 0],
                [0, 7, 7],
                [0, 0, 0]
            ];
    }
}

/**
 * Laterally move the tetromino if it doesn't collide with the arena or its boundaries
 * @param {Number} offset Offset of the lateral move, negative for left direction and positive for right
 */
function moveTetrominoLaterally(offset) {
    player.position.x += offset;

    if (isColliding(arena.sprite, player)) {
        player.position.x -= offset;
    }
}

/**
 * Rotate the current tetromino, offsetting it if necessary
 * @param {Number} direction Direction of the rotation: positive for clockwise, negative for counter-clockwise
 */
function rotateTetromino(direction) {
    const originalX = player.position.x;
    let offset = 1;

    rotateMatrix(player.sprite, direction);

    // If it collides, try moving the tetromino along the x axis to allow the rotation
    while (isColliding(arena.sprite, player)) {
        player.position.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));

        // If we moved by more than the piece width, be cancel the rotation and return
        if (offset > player.sprite[0].length) {
            rotateMatrix(player.sprite, -direction);
            player.position.x = originalX;
            return;
        }
    }
}

function updateScore() {
    document.getElementById("score").textContent = player.score;
    document.getElementById("tetrisIndicator").textContent = player.lastRowSweepWasTetris ? "TETRIS!" : "";
}

window.onload = () => {
    window.onkeydown = event => {
        switch (event.key) {
            case "ArrowRight":
            case "d":
                moveTetrominoLaterally(1);
                break;
            case "ArrowLeft":
            case "q":
                moveTetrominoLaterally(-1);
                break;
            case "ArrowDown":
            case "s":
                dropTetromino();
                break;
            case "ArrowUp":
            case "z":
                // TODO Don't do it like that. Need a function to check to highest Y where the tetromino can be placed
                //positionTetromino(tetromino.position.x, (canvas.height / canvasScale) - tetromino.height);
                break;
            case "a":
                rotateTetromino(-1);
                break;
            case "e":
                rotateTetromino(1);
        }
    };
}

resetPlayerSprite();
updateScore();
update();