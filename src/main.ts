import Phaser from 'phaser';
import { createGameConfig } from './game/GameConfig';
import './style.css';

window.addEventListener('load', () => {
  new Phaser.Game(createGameConfig());
});
