import os
from PIL import Image

for i in range(1, 44):
    folder = str(i)
    if not os.path.isdir(folder):
        continue
    for filename in os.listdir(folder):
        if filename.lower().endswith('.webp'):
            path = os.path.join(folder, filename)
            img = Image.open(path)
            w, h = img.size
            # Crop 40 pixels from left and right
            cropped = img.crop((40, 0, w - 40, h))
            # Calculate padding to make the image square
            new_size = cropped.width  # width after cropping
            pad_top = (new_size - cropped.height) // 2
            pad_bottom = new_size - cropped.height - pad_top
            # Add padding to top and bottom
            squared = Image.new("RGBA", (new_size, new_size), (0, 0, 0, 0))
            squared.paste(cropped, (0, pad_top))
            squared.save(path)