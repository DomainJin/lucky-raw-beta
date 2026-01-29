import os
from rembg import remove
from PIL import Image
import glob

def center_object(img):
    """Center the non-transparent object in the image"""
    # Get the bounding box of non-transparent pixels
    bbox = img.getbbox()
    
    if bbox is None:
        # No non-transparent pixels, return original image
        return img
    
    # Crop to the bounding box
    cropped = img.crop(bbox)
    
    # Get original image size
    orig_width, orig_height = img.size
    
    # Get cropped image size
    crop_width, crop_height = cropped.size
    
    # Calculate position to center the object
    x_offset = (orig_width - crop_width) // 2
    y_offset = (orig_height - crop_height) // 2
    
    # Create a new transparent image with original size
    centered_img = Image.new('RGBA', (orig_width, orig_height), (0, 0, 0, 0))
    
    # Paste the cropped object in the center
    centered_img.paste(cropped, (x_offset, y_offset))
    
    return centered_img

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# Find all compressed_final webp images in all subdirectories
image_files = sorted(glob.glob(os.path.join(script_dir, '*', 'compressed_final_*.webp')))
print(f"Found {len(image_files)} images to process")

for image_path in image_files:
    try:
        # Get the filename
        filename = os.path.basename(image_path)
        
        # Open the image
        input_img = Image.open(image_path)
        
        # Remove background
        output_img = remove(input_img)
        
        # Center the object in the image
        centered_img = center_object(output_img)
        
        # Overwrite the original file (save as WebP to preserve format)
        centered_img.save(image_path, 'WEBP')
        
        print(f"Processed and overwritten: {image_path}")
        
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

print("\nBackground removal complete!")
