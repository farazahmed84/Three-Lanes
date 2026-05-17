class IntroScene extends Phaser.Scene {
    constructor() {
        super('IntroScene');
    }

    preload() {
        this.load.image('background', 'assets/background.png');
        this.load.image('crosshair', 'assets/crosshair.png');
    }

    create() {
        this.add.image(640, 360, 'background')
            .setDisplaySize(1280, 720)
            .setAlpha(0.45);

        this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.45);
        this.input.setDefaultCursor('url(assets/crosshair.png) 64 64, crosshair');

        this.add.text(640, 110, 'THREE LANES', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '64px',
            color: '#d8ded7',
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(640, 245, [
            'A deadly infection has spread through the industrial sector.',
            'You are the last armed guard at an abandoned shipping yard.',
            'The infected keep emerging from the fog between the containers.',
            'Hold the line for as long as you can.'
        ], {
            fontFamily: 'Arial, sans-serif',
            fontSize: '28px',
            color: '#c7c9c0',
            align: 'center',
            lineSpacing: 12,
            wordWrap: { width: 920 }
        }).setOrigin(0.5);

        this.add.text(640, 430, 'Every wave becomes harder. Eventually, the shipping yard will fall.', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '24px',
            color: '#9fa69a',
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(640, 490, this.getBestStatsText(), {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '22px',
            color: '#d8ded7',
            align: 'center'
        }).setOrigin(0.5);

        this.createStartButton();
        this.createDeveloperCredit();
    }

    createDeveloperCredit() {
        this.add.text(640, 675, [
            'Created by Faraz The Web Guy',
            'www.farazthewebguy.com'
        ], {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#9fa69a',
            align: 'center',
            lineSpacing: 4
        }).setOrigin(0.5);
    }

    getBestStatsText() {
        const bestWave = Number(localStorage.getItem('threeLanesBestWave')) || 0;
        const bestScore = Number(localStorage.getItem('threeLanesBestScore')) || 0;

        return `BEST WAVE ${bestWave}  |  BEST SCORE ${bestScore}`;
    }

    createStartButton() {
        const button = this.add.rectangle(640, 585, 300, 76, 0x9f1d20, 1)
            .setStrokeStyle(3, 0xd8ded7)
            .setInteractive({ useHandCursor: true });

        const label = this.add.text(640, 585, 'START GAME', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(0.5);

        button.on('pointerover', () => button.setFillStyle(0xbf2528));
        button.on('pointerout', () => button.setFillStyle(0x9f1d20));
        button.on('pointerdown', () => {
            button.disableInteractive();
            label.setText('STARTING...');
            this.scene.start('GameScene');
        });
    }
}
