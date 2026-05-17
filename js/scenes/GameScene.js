class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('background', 'assets/background.png');
        this.load.image('crosshair', 'assets/crosshair.png');
        this.load.image('zombie1', 'assets/zombies/zombie1.png');
        this.load.image('zombie2', 'assets/zombies/zombie2.png');
        this.load.image('zombie3', 'assets/zombies/zombie3.png');
        this.load.image('zombie4', 'assets/zombies/zombie4.png');
        this.load.audio('zombieLoop', 'assets/sounds/zombie.mp3');
        this.load.audio('bullet', 'assets/sounds/bullet.mp3');
        this.load.audio('zombieHit', 'assets/sounds/zombie-hit.wav');
        this.load.audio('zombieDeath', 'assets/sounds/zombie-death.wav');
        this.load.audio('death', 'assets/sounds/death.wav');
    }

    create() {
        this.add.image(640, 360, 'background')
            .setDisplaySize(1280, 720);

        this.input.setDefaultCursor('none');

        this.backgroundSound = this.sound.add('zombieLoop', {
            loop: true,
            volume: 1
        });
        this.bulletSound = this.sound.add('bullet', {
            volume: 1
        });

        this.playBackgroundSound();
        this.input.once('pointerdown', () => this.playBackgroundSound());
        this.input.on('pointerdown', () => this.playBulletSound());
        this.input.keyboard.on('keydown-SPACE', () => this.togglePause());

        this.initializeWaveState();
        this.createHud();
        this.startWave();
        this.createDamageFlash();
        this.createCrosshair();
    }

    update(time, delta) {
        this.updateZombieAttackTimers(delta / 1000);
    }

    initializeWaveState() {
        this.wave = 1;
        this.playerMaxHp = 100;
        this.playerCurrentHp = 100;
        this.playerDamage = 10;
        this.globalAttackSpeedModifier = 0;
        this.score = 0;
        this.bestScore = this.loadBestScore();
        this.bestWave = this.loadBestWave();
        this.isNewBestScore = false;
        this.isNewBestWave = false;
        this.zombiesKilled = 0;
        this.totalZombiesKilled = 0;
        this.zombiesToSpawn = 0;
        this.zombiesSpawned = 0;
        this.spawnDelay = 0;
        this.spawnTimer = null;
        this.spawnTimerStartedAt = 0;
        this.spawnTimerRemaining = 0;
        this.isGameOver = false;
        this.isChoosingUpgrade = false;
        this.isPaused = false;
        this.hud = null;
        this.gameOverElements = null;
        this.upgradeElements = null;
        this.pauseElements = null;
        this.activeZombies = [];
        this.zombieKeys = ['zombie1', 'zombie2', 'zombie3', 'zombie4'];
        this.lanes = [
            { name: 'LEFT', x: 310, y: 610 },
            { name: 'CENTER', x: 640, y: 610 },
            { name: 'RIGHT', x: 970, y: 610 }
        ];
    }

    createCrosshair() {
        this.crosshair = this.add.image(640, 360, 'crosshair')
            .setDisplaySize(96, 96)
            .setDepth(1000)
            .setVisible(false);

        this.input.on('pointermove', (pointer) => this.updateCrosshair(pointer));
        this.input.on('pointerdown', (pointer) => this.updateCrosshair(pointer));
    }

    updateCrosshair(pointer) {
        if (this.isGameOver || this.isChoosingUpgrade || this.isPaused) {
            return;
        }

        this.crosshair
            .setPosition(pointer.x, pointer.y)
            .setVisible(true);
    }

    createDamageFlash() {
        this.damageFlash = this.add.rectangle(640, 360, 1280, 720, 0xb40000, 1)
            .setAlpha(0)
            .setDepth(900);
    }

    createHud() {
        this.hud = {
            panel: this.add.rectangle(640, 38, 1200, 56, 0x060809, 0.78)
                .setStrokeStyle(2, 0x2b3030)
                .setDepth(800),
            hpBack: this.add.rectangle(190, 38, 180, 18, 0x210b0d, 1)
                .setOrigin(0, 0.5)
                .setStrokeStyle(1, 0x000000)
                .setDepth(801),
            hpFill: this.add.rectangle(190, 38, 180, 18, 0x9f1d20, 1)
                .setOrigin(0, 0.5)
                .setDepth(802),
            hpText: this.add.text(58, 38, '', this.getHudTextStyle(18))
                .setOrigin(0, 0.5)
                .setDepth(803),
            waveText: this.add.text(420, 38, '', this.getHudTextStyle(22))
                .setOrigin(0, 0.5)
                .setDepth(803),
            zombiesText: this.add.text(625, 38, '', this.getHudTextStyle(22))
                .setOrigin(0, 0.5)
                .setDepth(803),
            scoreText: this.add.text(925, 38, '', this.getHudTextStyle(20))
                .setOrigin(0, 0.5)
                .setDepth(803),
            pauseButton: this.add.rectangle(1172, 38, 96, 34, 0x111719, 1)
                .setStrokeStyle(2, 0xd8ded7)
                .setInteractive({ useHandCursor: true })
                .setDepth(945),
            pauseText: this.add.text(1172, 38, 'PAUSE', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '15px',
                color: '#ffffff'
            })
                .setOrigin(0.5)
                .setDepth(946)
        };

        this.hud.pauseButton.on('pointerover', () => this.hud.pauseButton.setFillStyle(0x1b2527));
        this.hud.pauseButton.on('pointerout', () => this.hud.pauseButton.setFillStyle(0x111719));
        this.hud.pauseButton.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) {
                event.stopPropagation();
            }

            this.togglePause();
        });

        this.updateHud();
    }

    getHudTextStyle(fontSize) {
        return {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: `${fontSize}px`,
            color: '#d8ded7'
        };
    }

    loadBestScore() {
        return Number(localStorage.getItem('threeLanesBestScore')) || 0;
    }

    loadBestWave() {
        return Number(localStorage.getItem('threeLanesBestWave')) || 0;
    }

    saveBestStats() {
        this.isNewBestScore = this.score > this.bestScore;
        this.isNewBestWave = this.wave > this.bestWave;

        if (this.isNewBestScore) {
            this.bestScore = this.score;
            localStorage.setItem('threeLanesBestScore', String(this.bestScore));
        }

        if (this.isNewBestWave) {
            this.bestWave = this.wave;
            localStorage.setItem('threeLanesBestWave', String(this.bestWave));
        }
    }

    updateHud() {
        if (!this.hud) {
            return;
        }

        const hpPercent = Phaser.Math.Clamp(this.playerCurrentHp / this.playerMaxHp, 0, 1);
        const zombiesRemaining = Math.max(0, this.zombiesToSpawn - this.zombiesKilled);

        this.hud.hpFill.width = 180 * hpPercent;
        this.hud.hpText.setText(`HP ${this.playerCurrentHp}/${this.playerMaxHp}`);
        this.hud.waveText.setText(`WAVE ${this.wave}`);
        this.hud.zombiesText.setText(`ZOMBIES ${zombiesRemaining}/${this.zombiesToSpawn}`);
        this.hud.scoreText.setText(`SCORE ${this.score}`);
        this.hud.pauseText.setText(this.isPaused ? 'RESUME' : 'PAUSE');
    }

    startWave(showBanner = true) {
        this.zombiesToSpawn = this.getZombiesForWave();
        this.spawnDelay = this.getSpawnDelayForWave();
        this.zombiesSpawned = 0;
        this.zombiesKilled = 0;
        this.spawnZombie();
        this.scheduleNextZombieSpawn();
        this.updateHud();

        if (showBanner) {
            this.showWaveStartBanner();
        }
    }

    showWaveStartBanner() {
        this.showCenterNotice(`WAVE ${this.wave}`, `${this.zombiesToSpawn} INFECTED INBOUND`, 540);
    }

    getZombiesForWave() {
        return 5 + (this.wave * 2);
    }

    getZombieHpForWave() {
        return 18 + (this.wave * 5);
    }

    getZombieAttackDamageForWave() {
        return 5 + Math.floor(this.wave / 2);
    }

    getZombieAttackTimeForWave() {
        return Math.max(1.6, 5.1 - (this.wave * 0.2)) + this.globalAttackSpeedModifier;
    }

    getSpawnDelayForWave() {
        return Math.max(0.6, 2.45 - (this.wave * 0.1));
    }

    showUpgradeFeedback(message) {
        this.showCenterNotice(message, `WAVE ${this.wave} BEGINS`, 700);
    }

    showCenterNotice(titleText, subtitleText, depth) {
        if (this.centerNotice) {
            this.centerNotice.destroy();
        }

        const container = this.add.container(640, 235).setDepth(depth);
        const panel = this.add.rectangle(0, 0, 520, 112, 0x060809, 0.82)
            .setStrokeStyle(2, 0x9f1d20);
        const title = this.add.text(0, -20, titleText, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '38px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        const subtitle = this.add.text(0, 28, subtitleText, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '18px',
            color: '#c7c9c0',
            align: 'center'
        }).setOrigin(0.5);

        container.add([panel, title, subtitle]);
        container.setAlpha(0);
        this.centerNotice = container;

        this.tweens.add({
            targets: container,
            alpha: 1,
            y: 250,
            duration: 180,
            ease: 'Power2',
            yoyo: true,
            hold: 1900,
            onComplete: () => {
                if (this.centerNotice === container) {
                    this.centerNotice = null;
                }

                container.destroy();
            }
        });
    }

    spawnZombie() {
        if (this.isGameOver || this.isChoosingUpgrade || this.isPaused || this.zombiesSpawned >= this.zombiesToSpawn || this.activeZombies.length >= 3) {
            return;
        }

        const availableLanes = this.getAvailableLanes();

        if (availableLanes.length === 0) {
            return;
        }

        const lane = Phaser.Utils.Array.GetRandom(availableLanes);
        const zombieKey = Phaser.Utils.Array.GetRandom(this.zombieKeys);
        const maxHp = this.getZombieHpForWave();
        const attackTime = this.getZombieAttackTimeForWave();
        const attackDamage = this.getZombieAttackDamageForWave();
        const sprite = this.add.image(lane.x, 830, zombieKey)
            .setDisplaySize(220, 220)
            .setInteractive();
        const bars = this.createZombieBars(lane.x);

        const zombie = {
            lane: lane.name,
            sprite: sprite,
            hp: maxHp,
            maxHp: maxHp,
            attackDamage: attackDamage,
            attackTime: attackTime,
            attackTimerCurrent: 0,
            bars: bars,
            isRemoving: false
        };

        sprite.on('pointerdown', (pointer, localX, localY, event) => {
            this.updateCrosshair(pointer);

            if (event) {
                event.stopPropagation();
            }

            this.playBulletSound();
            this.damageZombie(zombie);
        });

        this.activeZombies.push(zombie);
        this.zombiesSpawned += 1;

        this.tweens.add({
            targets: sprite,
            y: lane.y,
            duration: 420,
            ease: 'Linear'
        });
        this.tweens.add({
            targets: bars.container,
            y: lane.y - 130,
            duration: 420,
            ease: 'Linear'
        });
    }

    scheduleNextZombieSpawn() {
        if (this.isGameOver || this.isChoosingUpgrade || this.isPaused || this.spawnTimer || this.zombiesSpawned >= this.zombiesToSpawn || this.activeZombies.length >= 3) {
            return;
        }

        this.createSpawnTimer(this.spawnDelay * 1000);
    }

    createSpawnTimer(delayMs) {
        this.spawnTimerRemaining = delayMs;
        this.spawnTimerStartedAt = this.time.now;
        this.spawnTimer = this.time.delayedCall(delayMs, () => {
            this.spawnTimer = null;
            this.spawnTimerRemaining = 0;
            this.spawnZombie();
            this.scheduleNextZombieSpawn();
        });
    }

    createZombieBars(x) {
        const container = this.add.container(x, 685);
        const hpBack = this.add.rectangle(0, 0, 150, 10, 0x160f10, 0.95)
            .setStrokeStyle(1, 0x000000);
        const hpFill = this.add.rectangle(-75, 0, 150, 10, 0x9f1d20, 1)
            .setOrigin(0, 0.5);
        const timerBack = this.add.rectangle(0, 18, 150, 8, 0x121617, 0.95)
            .setStrokeStyle(1, 0x000000);
        const timerFill = this.add.rectangle(-75, 18, 0, 8, 0xd8ded7, 1)
            .setOrigin(0, 0.5);

        container.add([hpBack, hpFill, timerBack, timerFill]);
        container.setDepth(10);

        return {
            container: container,
            hpFill: hpFill,
            timerFill: timerFill,
            maxBarWidth: 150
        };
    }

    getAvailableLanes() {
        const occupiedLanes = this.activeZombies.map((zombie) => zombie.lane);

        return this.lanes.filter((lane) => !occupiedLanes.includes(lane.name));
    }

    damageZombie(zombie) {
        if (this.isGameOver || this.isPaused || zombie.isRemoving) {
            return;
        }

        zombie.hp -= this.playerDamage;
        zombie.sprite.setTint(0xff7777);
        this.updateZombieHpBar(zombie);

        this.time.delayedCall(80, () => {
            if (zombie.sprite.active) {
                zombie.sprite.clearTint();
            }
        });

        if (zombie.hp <= 0) {
            this.killZombie(zombie);
        }
    }

    killZombie(zombie) {
        if (zombie.isRemoving) {
            return;
        }

        zombie.isRemoving = true;
        this.activeZombies = this.activeZombies.filter((activeZombie) => activeZombie !== zombie);
        zombie.sprite.disableInteractive();
        this.zombiesKilled += 1;
        this.totalZombiesKilled += 1;
        this.score += zombie.maxHp;
        this.updateHud();
        this.playZombieDeathSound();

        this.tweens.add({
            targets: [zombie.sprite, zombie.bars.container],
            alpha: 0,
            scaleX: 0.8,
            scaleY: 0.8,
            duration: 180,
            ease: 'Power2',
            onComplete: () => {
                zombie.sprite.destroy();
                zombie.bars.container.destroy();

                if (!this.checkWaveComplete()) {
                    this.scheduleNextZombieSpawn();
                }
            }
        });
    }

    checkWaveComplete() {
        if (this.isGameOver || this.isChoosingUpgrade) {
            return false;
        }

        if (this.zombiesKilled < this.zombiesToSpawn || this.activeZombies.length > 0) {
            return false;
        }

        this.showUpgradeSelection();
        return true;
    }

    showUpgradeSelection() {
        this.isChoosingUpgrade = true;
        this.input.setDefaultCursor('auto');

        if (this.spawnTimer) {
            this.spawnTimer.remove(false);
            this.spawnTimer = null;
        }

        if (this.crosshair) {
            this.crosshair.setVisible(false);
        }

        const overlay = this.add.rectangle(640, 360, 1280, 720, 0x020202, 0.72)
            .setDepth(930);
        const title = this.add.text(640, 165, `WAVE ${this.wave} CLEARED`, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '54px',
            color: '#d8ded7'
        }).setOrigin(0.5).setDepth(931);
        const prompt = this.add.text(640, 225, 'CHOOSE ONE UPGRADE', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '26px',
            color: '#9fa69a'
        }).setOrigin(0.5).setDepth(931);

        const upgrades = [
            { key: 'heal', title: '+50 HP', detail: 'Restore current HP only', x: 205 },
            { key: 'maxHp', title: '+20 MAX HP', detail: 'Increase max HP only', x: 495 },
            { key: 'damage', title: '+5 DAMAGE', detail: 'Kill infected faster', x: 785 },
            { key: 'slow', title: 'SLOW ATTACKS', detail: 'Adds 0.05s to zombie attack timers', x: 1075 }
        ];

        const buttons = upgrades.flatMap((upgrade) => this.createUpgradeButton(upgrade));
        this.upgradeElements = [overlay, title, prompt, ...buttons];
    }

    createUpgradeButton(upgrade) {
        const button = this.add.rectangle(upgrade.x, 415, 250, 150, 0x111719, 1)
            .setStrokeStyle(3, 0x9f1d20)
            .setInteractive({ useHandCursor: true })
            .setDepth(931);
        const title = this.add.text(upgrade.x, 385, upgrade.title, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '24px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5).setDepth(932);
        const detail = this.add.text(upgrade.x, 440, upgrade.detail, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#c7c9c0',
            align: 'center',
            wordWrap: { width: 210 }
        }).setOrigin(0.5).setDepth(932);

        button.on('pointerover', () => button.setFillStyle(0x1b2527));
        button.on('pointerout', () => button.setFillStyle(0x111719));
        button.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) {
                event.stopPropagation();
            }

            this.applyUpgrade(upgrade.key);
        });

        return [button, title, detail];
    }

    applyUpgrade(upgradeKey) {
        if (!this.isChoosingUpgrade) {
            return;
        }

        let feedbackMessage = '';

        if (upgradeKey === 'heal') {
            this.playerCurrentHp = Math.min(this.playerMaxHp, this.playerCurrentHp + 50);
            feedbackMessage = 'HP RESTORED';
        } else if (upgradeKey === 'maxHp') {
            this.playerMaxHp += 20;
            feedbackMessage = 'MAX HP INCREASED';
        } else if (upgradeKey === 'damage') {
            this.playerDamage += 5;
            feedbackMessage = 'DAMAGE INCREASED';
        } else if (upgradeKey === 'slow') {
            this.globalAttackSpeedModifier += 0.05;
            feedbackMessage = 'ZOMBIES SLOWED';
        }

        this.upgradeElements.forEach((element) => element.destroy());
        this.upgradeElements = null;
        this.isChoosingUpgrade = false;
        this.input.setDefaultCursor('none');

        this.wave += 1;
        this.startWave(false);
        this.showUpgradeFeedback(feedbackMessage);
    }

    updateZombieHpBar(zombie) {
        const hpPercent = Phaser.Math.Clamp(zombie.hp / zombie.maxHp, 0, 1);

        zombie.bars.hpFill.width = zombie.bars.maxBarWidth * hpPercent;
    }

    updateZombieAttackTimers(deltaSeconds) {
        if (this.isGameOver || this.isChoosingUpgrade || this.isPaused) {
            return;
        }

        this.activeZombies.slice().forEach((zombie) => {
            if (zombie.isRemoving) {
                return;
            }

            zombie.attackTimerCurrent += deltaSeconds;
            this.updateZombieTimerBar(zombie);

            if (zombie.attackTimerCurrent >= zombie.attackTime) {
                this.zombieAttack(zombie);
            }
        });
    }

    updateZombieTimerBar(zombie) {
        const timerPercent = Phaser.Math.Clamp(zombie.attackTimerCurrent / zombie.attackTime, 0, 1);

        zombie.bars.timerFill.width = zombie.bars.maxBarWidth * timerPercent;
    }

    zombieAttack(zombie) {
        if (this.isGameOver || this.isPaused || zombie.isRemoving) {
            return;
        }

        this.playerCurrentHp = Math.max(0, this.playerCurrentHp - zombie.attackDamage);
        zombie.attackTimerCurrent = 0;
        this.updateZombieTimerBar(zombie);
        this.updateHud();

        if (this.playerCurrentHp <= 0) {
            this.showGameOver();
            return;
        }

        this.playZombieHitSound();
        this.flashDamageOverlay();
    }

    showGameOver() {
        if (this.isGameOver || this.isChoosingUpgrade) {
            return;
        }

        this.isGameOver = true;

        if (this.spawnTimer) {
            this.spawnTimer.remove(false);
            this.spawnTimer = null;
        }

        this.activeZombies.forEach((zombie) => zombie.sprite.disableInteractive());
        this.input.setDefaultCursor('auto');

        if (this.crosshair) {
            this.crosshair.setVisible(false);
        }

        if (this.backgroundSound && this.backgroundSound.isPlaying) {
            this.backgroundSound.stop();
        }

        this.saveBestStats();
        this.updateHud();
        this.playDeathSound();
        this.createGameOverScreen();
    }

    createGameOverScreen() {
        const overlay = this.add.rectangle(640, 360, 1280, 720, 0x020202, 0.82)
            .setDepth(950);

        const title = this.add.text(640, 220, 'GAME OVER', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '72px',
            color: '#b80f16'
        }).setOrigin(0.5).setDepth(951);

        const stats = this.add.text(640, 380, [
            `WAVE REACHED: ${this.wave}`,
            `ZOMBIES KILLED: ${this.totalZombiesKilled}`,
            `FINAL SCORE: ${this.score}`,
            `BEST WAVE: ${this.bestWave}`,
            `BEST SCORE: ${this.bestScore}`
        ], {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '27px',
            color: '#d8ded7',
            align: 'center',
            lineSpacing: 12
        }).setOrigin(0.5).setDepth(951);

        const bestNotice = this.add.text(640, 525, this.getBestNoticeText(), {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '22px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(951);

        const restartButton = this.add.rectangle(640, 610, 260, 68, 0x9f1d20, 1)
            .setStrokeStyle(3, 0xd8ded7)
            .setInteractive({ useHandCursor: true })
            .setDepth(951);
        const restartLabel = this.add.text(640, 610, 'RESTART', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(952);

        restartButton.on('pointerover', () => restartButton.setFillStyle(0xbf2528));
        restartButton.on('pointerout', () => restartButton.setFillStyle(0x9f1d20));
        restartButton.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) {
                event.stopPropagation();
            }

            this.restartGame();
        });

        this.gameOverElements = [overlay, title, stats, bestNotice, restartButton, restartLabel];
    }

    getBestNoticeText() {
        if (this.isNewBestScore && this.isNewBestWave) {
            return 'NEW BEST WAVE AND SCORE';
        }

        if (this.isNewBestScore) {
            return 'NEW BEST SCORE';
        }

        if (this.isNewBestWave) {
            return 'NEW BEST WAVE';
        }

        return '';
    }

    restartGame() {
        this.sound.stopAll();
        this.scene.restart();
    }

    togglePause() {
        if (this.isGameOver || this.isChoosingUpgrade) {
            return;
        }

        if (this.isPaused) {
            this.resumeGame();
            return;
        }

        this.pauseGame();
    }

    pauseGame() {
        this.isPaused = true;
        this.input.setDefaultCursor('auto');
        this.updateHud();

        if (this.crosshair) {
            this.crosshair.setVisible(false);
        }

        if (this.spawnTimer) {
            const elapsed = this.time.now - this.spawnTimerStartedAt;
            this.spawnTimerRemaining = Math.max(50, this.spawnTimerRemaining - elapsed);
            this.spawnTimer.remove(false);
            this.spawnTimer = null;
        }

        this.createPauseOverlay();
    }

    resumeGame() {
        this.isPaused = false;
        this.input.setDefaultCursor('none');
        this.updateHud();

        if (this.pauseElements) {
            this.pauseElements.forEach((element) => element.destroy());
            this.pauseElements = null;
        }

        if (this.spawnTimerRemaining > 0) {
            this.createSpawnTimer(this.spawnTimerRemaining);
        } else {
            this.scheduleNextZombieSpawn();
        }
    }

    createPauseOverlay() {
        const overlay = this.add.rectangle(640, 360, 1280, 720, 0x020202, 0.66)
            .setDepth(940);
        const title = this.add.text(640, 305, 'PAUSED', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '64px',
            color: '#d8ded7'
        }).setOrigin(0.5).setDepth(941);
        const prompt = this.add.text(640, 380, 'PRESS SPACE OR TAP RESUME', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '24px',
            color: '#9fa69a'
        }).setOrigin(0.5).setDepth(941);

        this.pauseElements = [overlay, title, prompt];
    }

    playBackgroundSound() {
        if (this.sound.locked) {
            this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.playBackgroundSound());
            return;
        }

        if (!this.backgroundSound.isPlaying) {
            this.backgroundSound.play();
        }
    }

    playBulletSound() {
        if (this.isGameOver || this.isChoosingUpgrade || this.isPaused) {
            return;
        }

        if (this.sound.locked) {
            this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.playBulletSound());
            return;
        }

        this.bulletSound.play();
    }

    playZombieHitSound() {
        if (this.sound.locked) {
            this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.playZombieHitSound());
            return;
        }

        this.sound.play('zombieHit', {
            volume: 1
        });
    }

    playZombieDeathSound() {
        if (this.sound.locked) {
            this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.playZombieDeathSound());
            return;
        }

        this.sound.play('zombieDeath', {
            volume: 1
        });
    }

    playDeathSound() {
        if (this.sound.locked) {
            this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.playDeathSound());
            return;
        }

        this.sound.play('death', {
            volume: 1
        });
    }

    flashDamageOverlay() {
        this.tweens.killTweensOf(this.damageFlash);
        this.damageFlash.setAlpha(0.55);

        this.tweens.add({
            targets: this.damageFlash,
            alpha: 0,
            duration: 260,
            ease: 'Power2'
        });
    }
}
