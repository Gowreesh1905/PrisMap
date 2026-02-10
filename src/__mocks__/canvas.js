module.exports = {
    createCanvas: () => ({
        getContext: () => ({
            fillRect: () => { },
            drawImage: () => { },
            getImageData: () => ({ data: [] }),
            putImageData: () => { },
            createImageData: () => ({ data: [] }),
            setTransform: () => { },
            resetTransform: () => { },
            save: () => { },
            restore: () => { },
            translate: () => { },
            rotate: () => { },
            scale: () => { },
            beginPath: () => { },
            moveTo: () => { },
            lineTo: () => { },
            stroke: () => { },
            fill: () => { },
            rect: () => { },
            arc: () => { },
            measureText: () => ({ width: 0 }),
        }),
        toDataURL: () => '',
        width: 0,
        height: 0,
    }),
    loadImage: () => Promise.resolve({ width: 100, height: 100 }),
    Image: class {
        constructor() { this.onload = () => { }; }
    }
};
