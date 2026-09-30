# キャラクター画像

`adventurers-atlas.png` と、`jobs-1-v3.png`〜`jobs-3-v3.png`、`races-1-v3.png`〜`races-3-v3.png`、`births-1-v3.png`〜`births-3-v3.png` は内蔵 image_gen ツールで新規生成したオリジナル素材です。v3の生成では `adventurers-atlas.png` だけを画像参照として使用し、以前の生成画像やユーザー添付画像は参照していません。

追加アトラスは各5列×3行です。職業15種×3画像、種族15種×3画像、生まれ15種×3画像の合計135画像と、従来画像8種を `tools/split-portrait-atlases.ps1` で `individual/` 以下の256×384px透明PNGへ分割しています。ゲーム画面では143種すべてを共通の2:3表示枠へ個別PNGとして表示するため、隣のセルの人物が混ざらず、画面ごとの縦横比も変わりません。v3では参照元に合わせ、ほぼ黒一色の平面的な全身シルエット、太く簡潔な外形、最小限の内部線へ統一しました。透明背景、文字・枠・ロゴなし、各セルで装備・体格・姿勢・大きな小物によって分類を判別できることを共通条件としています。

同じ分類の3画像が小物違いに見えないよう、バリエーションには次の明確な役割を持たせています。

- `*-1.png`：標準的で均整の取れた基準デザイン
- `*-2.png`：若手・軽装・行動的。非対称な装備、細身または小柄な体格、動きの大きい姿勢
- `*-3.png`：熟練・重装・儀礼的。年長者や大柄な体格、大型装備、静かで威厳のある姿勢

第2・第3バリエーションは、性別表現・年齢・体格・姿勢・服装・装備・大きなシルエットまで変える方針で再生成しています。画像ID、アトラス内の並び順、セーブデータの形式は変更していません。

## 最終生成プロンプト

v3の9枚は、以下の共通指示に「職業15種」「種族15種」「生まれ15種」の各並び順を加えて生成しました。各分類につき、標準・若手軽装・熟練儀礼の3方向を別々に生成しています。

Use case: stylized-concept. Asset type: a single square transparent 5×3 character sprite atlas for a fantasy guild browser game. `adventurers-atlas.png` is the only visual reference; do not use or recall any other generated atlas, screenshot, game, artist, or image. Exactly 15 distinct full-body figures, centered in equal cells with a consistent baseline and generous transparent padding. Match the reference closely: nearly solid ink-black, flat monochrome silhouettes; bold uncluttered outer contours; only a very small number of thin dark-gray interior separations or transparent negative-space cuts. No modeled lighting, realistic rendering, painterly shading, material texture, facial rendering, or intricate armor detail. Readable at 60px tall. No background fill, grid lines, panels, text, labels, UI, scenery, floor shadows, glow, color, or watermark.

Variant 1: balanced standard adventurers in practical equipment and calm ready poses. Variant 2: youthful agile alternates with lighter asymmetric gear, active poses, smaller or slimmer builds, and different gender presentation. Variant 3: veteran ceremonial alternates with older or larger builds, layered clothing or armor, heirloom tools, and composed authoritative poses.

従来の8体アトラスの生成指示は以下です。

Use case: stylized-concept. Asset type: a SINGLE game character sprite atlas, square image. Create an original monochrome silhouette character-selection atlas for a fantasy adventurer guild browser game. Exactly 8 different full-body figures in a strict equal-size 4 column by 2 row grid, no gutters, no borders, no labels or text. Each figure centered within its own cell, entirely within inner 75% cell bounds including weapons and hats, feet at consistent baseline. Solid ink-black silhouettes with small negative-space details against flat pure white background, strong readable shapes at thumbnail size, elegant classic RPG fantasy. Row 1 left to right: sword-and-shield armored knight; short-caped agile dual-dagger rogue; long-robed pointed-hat mage holding staff; hooded priest holding a rounded ceremonial staff. Row 2 left to right: slender long-haired elf archer with bow; short broad bearded dwarf with battle axe; armored woman with spear and ponytail; cloaked wandering ranger holding crossbow. Each distinct original pose, balanced restrained character design. Not artwork copied from any existing game. No UI, no screenshot, no panels, no decorations, no gradients, no shadows, no watermark. Grid must be precisely uniform so CSS background-position can isolate each sprite.
