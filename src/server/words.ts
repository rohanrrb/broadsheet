/**
 * 256 short, plain words. Writer keys are made of six of them (48 bits, one
 * byte per word), and the pen names the paper makes up or suggests of two.
 */
export const WORDS: readonly string[] = `
acorn amber anchor apple april arrow aspen atlas autumn badger bamboo banjo barley basil beacon berry
birch biscuit bison blanket bloom bonnet bottle bramble brass breeze bridge brook bucket butter button cabin
cactus candle canoe canyon carpet cedar cello chalk cherry chimney cider cinder citrus clay cliff clover
cobalt comet copper coral cotton cradle crane cricket crow crumb curtain daisy dapple dawn delta desert
dove drift drum dune eagle ebony echo elbow elder ember engine fable falcon feather fennel fern
ferry fiddle finch flannel flint flour forest fossil fox frost garden garlic garnet ginger glacier glove
gold goose granite grape gravel harbor harvest hazel heron hickory hollow honey horizon hornet ivory jacket
jade jasper jigsaw juniper kettle kite ladder lagoon lake lantern larch lark laurel lemon lichen lilac
linen lizard lodge lotus lumber lunar magnet mango maple marble marsh meadow melon mint mirror mitten
moss moth mountain mulberry mustard napkin nectar needle nettle north nutmeg oak oasis oat ocean olive
onion opal orbit orchard otter owl oyster paddle paper parsley pebble pecan pepper piano pickle pigeon
pine pillow plum pocket pollen pond poppy prairie pretzel pumpkin quail quartz quill quilt rabbit radish
raft rain raven reed ribbon ridge river robin rocket rose rust saddle saffron sage salmon salt
sand satin scarf shadow shell shore silver slate sleet smoke snow sparrow spruce stone storm straw
sugar summer sunset swan tangle teapot thimble thistle thunder timber toast tulip tunnel turnip turtle twig
umber valley velvet violet walnut walrus water wheat whistle willow window winter wren yarn yellow zebra
`
  .trim()
  .split(/\s+/);
