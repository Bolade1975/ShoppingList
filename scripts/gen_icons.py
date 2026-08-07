from PIL import Image, ImageDraw

BG = (31, 111, 92, 255)  # matches --color-accent light theme
WHITE = (255, 255, 255, 255)


def draw_badge(size, corner_radius, padding_ratio=0.0):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = int(size * padding_ratio)
    draw.rounded_rectangle(
        [pad, pad, size - 1 - pad, size - 1 - pad], radius=corner_radius, fill=BG
    )

    # Simple shopping-bag glyph, hand-drawn, no icon library.
    cx = size / 2
    bag_left = size * 0.28
    bag_right = size * 0.72
    bag_top = size * 0.40
    bag_bottom = size * 0.80
    stroke = max(2, size // 28)

    draw.rounded_rectangle(
        [bag_left, bag_top, bag_right, bag_bottom], radius=size * 0.03, outline=WHITE, width=stroke
    )

    # Handle: an arc over the top of the bag.
    handle_r = size * 0.12
    draw.arc(
        [cx - handle_r, bag_top - handle_r * 1.6, cx + handle_r, bag_top + handle_r * 0.4],
        start=180,
        end=360,
        fill=WHITE,
        width=stroke,
    )

    # Checkmark inside the bag.
    draw.line(
        [
            (cx - size * 0.09, bag_top + size * 0.20),
            (cx - size * 0.02, bag_top + size * 0.27),
            (cx + size * 0.11, bag_top + size * 0.10),
        ],
        fill=WHITE,
        width=stroke,
        joint="curve",
    )
    return img


# Standard icons (rounded square, small padding so the glyph doesn't touch edges)
draw_badge(192, 40).save("public/icons/icon-192.png")
draw_badge(512, 108).save("public/icons/icon-512.png")

# Maskable icon needs extra safe-zone padding (Android may crop to a circle)
draw_badge(512, 0, padding_ratio=0.1).save("public/icons/icon-512-maskable.png")

# Apple touch icon: iOS applies its own corner rounding, so keep this square/no radius
draw_badge(180, 0).save("public/apple-touch-icon.png")
