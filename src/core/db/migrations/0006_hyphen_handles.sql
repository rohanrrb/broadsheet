-- Handles now fold spaces, underscores and hyphens to a hyphen, where they used
-- to fold to an underscore. No name could hold a hyphen before, so rewriting
-- the stored handles cannot make two writers collide.
UPDATE `writers` SET `handle` = replace(`handle`, '_', '-');
