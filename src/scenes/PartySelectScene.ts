import Phaser from 'phaser';
import { classTextureKey } from '../assets/characters';
import { CLASSES } from '../data/classes';
import { bindSceneKeys } from '../systems/keys';
import { Registry } from '../systems/registry';
import { saveGame, startNewGame } from '../systems/save';
import type { ClassId } from '../data/types';
import { UI } from '../ui/theme';

export class PartySelectScene extends Phaser.Scene {
  private cursor = 0;
  private selected: ClassId[] = [];
  private lines: Phaser.GameObjects.Text[] = [];
  private detail!: Phaser.GameObjects.Text;
  private partyText!: Phaser.GameObjects.Text;
  private preview!: Phaser.GameObjects.Image;

  constructor() {
    super('PartySelect');
  }

  create(): void {
    const { width } = this.scale;
    this.add.rectangle(width / 2, this.scale.height / 2, width, this.scale.height, 0x101624);

    this.add
      .text(width / 2, 28, 'Choose 4 Traditions', {
        fontFamily: UI.font,
        fontSize: '20px',
        color: UI.color.cream,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 52, 'Enter/Space: toggle   ↑↓: move   C: confirm party', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: UI.color.muted,
      })
      .setOrigin(0.5);

    CLASSES.forEach((cls, i) => {
      const t = this.add.text(72, 78 + i * 28, '', {
        fontFamily: UI.font,
        fontSize: UI.body,
        color: UI.color.body,
      });
      this.lines.push(t);
      this.add.image(48, 86 + i * 28, classTextureKey(cls.id)).setScale(0.45);
    });

    this.preview = this.add.image(560, 180, classTextureKey(CLASSES[0].id)).setScale(2.2);

    this.detail = this.add.text(430, 260, '', {
      fontFamily: UI.font,
      fontSize: UI.small,
      color: UI.color.body,
      wordWrap: { width: 320 },
      lineSpacing: 4,
    });

    this.partyText = this.add.text(430, 420, '', {
      fontFamily: UI.font,
      fontSize: UI.small,
      color: UI.color.accent,
      wordWrap: { width: 320 },
    });

    this.refresh();

    bindSceneKeys(this, {
      'keydown-UP': () => {
        this.cursor = (this.cursor + CLASSES.length - 1) % CLASSES.length;
        this.refresh();
      },
      'keydown-DOWN': () => {
        this.cursor = (this.cursor + 1) % CLASSES.length;
        this.refresh();
      },
      'keydown-W': () => {
        this.cursor = (this.cursor + CLASSES.length - 1) % CLASSES.length;
        this.refresh();
      },
      'keydown-S': () => {
        this.cursor = (this.cursor + 1) % CLASSES.length;
        this.refresh();
      },
      'keydown-ENTER': () => this.toggle(),
      'keydown-SPACE': () => this.toggle(),
      'keydown-C': () => this.confirm(),
      'keydown-ESC': () => this.scene.start('Title'),
    });
  }

  private toggle(): void {
    const id = CLASSES[this.cursor].id;
    if (this.selected.includes(id)) {
      this.selected = this.selected.filter((x) => x !== id);
    } else if (this.selected.length < 4) {
      this.selected.push(id);
    }
    this.refresh();
  }

  private confirm(): void {
    if (this.selected.length !== 4) return;
    const state = startNewGame(this.selected);
    Registry.set(state);
    saveGame(state);
    this.scene.start('Town');
  }

  private refresh(): void {
    CLASSES.forEach((cls, i) => {
      const mark = this.selected.includes(cls.id) ? '[✓]' : '[ ]';
      const cursor = i === this.cursor ? '▸' : ' ';
      this.lines[i].setText(`${cursor} ${mark} ${cls.name} — ${cls.role}`);
      this.lines[i].setColor(i === this.cursor ? UI.color.accent : UI.color.body);
    });
    const cur = CLASSES[this.cursor];
    this.preview.setTexture(classTextureKey(cur.id));
    this.detail.setText(
      `${cur.name}\n\n${cur.description}\n\nHP ${cur.base.hp}  MP ${cur.base.mp}  ATK ${cur.base.atk}  DEF ${cur.base.def}\nMAT ${cur.base.mat}  MDF ${cur.base.mdf}  AGI ${cur.base.agi}  LUK ${cur.base.luk}`,
    );
    this.partyText.setText(
      `Party ${this.selected.length}/4: ${
        this.selected.map((id) => CLASSES.find((c) => c.id === id)!.name).join(', ') || '—'
      }` + (this.selected.length === 4 ? '\nPress C to begin your quest.' : ''),
    );
  }
}
