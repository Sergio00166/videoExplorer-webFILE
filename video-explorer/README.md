This is an plugin for the webFILE server.    
It looks for the folders that has videos, and looks for an folder ```.thumbnails``` to load    
the thumbnails for the video, also for the folder it will load the text inside a file    
called ```description.txt``` and the poster when is a image callled ```poser.jpg```.    
For all images it support .webp, .png, .jpg and .jpeg files.    
    
An example structure:    
```
folder:    
    .thumbnails    
        1.mkv.webp    
    1.mkv    
    description.txt    
    poster.jpg
```
