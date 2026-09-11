-- Rounds 0019: a 1280 px front photo can pass 2 MB. Allow 5 MB, same as check-in photos.
update storage.buckets set file_size_limit = 5242880 where id = 'pub-photos';
