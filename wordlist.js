/*
 * Short, common, easy-to-spell words for passphrases.
 * Entropy is calculated from the deduplicated list size, so adding words only makes passphrases stronger.
 */
(function (global) {
  'use strict';
  const RAW = `
acid acorn actor adapt agent agile alarm album alert alien alley alpha amber ample anchor angle ankle apple apron
arena armor arrow atlas attic audio autumn avocado badge bagel baker bamboo banjo barn basil basket beach beacon
beard beetle bell bench berry bicycle bison blade blanket blaze blender bloom blossom board bold bonus border
bottle boulder bounce bracket brain branch brave bread breeze brick bridge bright brisk brook brush bubble bucket
buddy buffalo bugle bundle butter button cabin cable cactus calm camel camera canal candle candy canoe canvas
canyon captain carbon cargo carpet carrot castle cedar cello cereal chalk channel cheese cherry chess chimney
chorus cider cinema circle citrus clay clever cliff clock cloud clover coast cobalt cocoa coconut comet compass
copper coral cosmic cotton cougar cowboy coyote cozy crane crater crayon cricket crisp crown crystal cube cupcake
curtain cushion daisy dance daring dawn delta denim desert diamond dinner dolphin domino donkey dragon drama
dream drift drum eager eagle earth easel echo eclipse elbow element ember emerald engine epic fabric falcon fancy
feather fence ferry fiddle field fiesta finch fire flame flannel fluffy flute focus forest fossil fountain fox
frost frozen fudge fuzzy galaxy garden garlic gecko gentle geyser giant ginger glacier globe glossy glove goblin
golden gopher gorilla grand granite grape gravel guitar gull habit hammer happy harbor harvest hazel helmet
hermit heron hiking hippo hobby hollow honey hornet hotel humble husky igloo iguana island ivory jacket jaguar
jelly jester jigsaw jockey jolly journal jungle kayak keen kernel kettle kingdom kitten koala ladder lagoon
lantern laptop lava lemon lentil leopard lettuce lilac lime linen lion lively lizard lobster locket lotus lucky
lunar lyric magnet mango maple marble market meadow mellow melody melon merry meteor mighty mint mirror mitten
monkey mosaic moss motor muffin museum mustard nectar needle nickel noble noodle north nugget oasis ocean olive
onion opera orbit orchid otter owl oxygen paddle palace panda paper parade parrot pasta peach peanut pebble
pelican pepper piano pickle pigeon pillow pilot pine pirate pixel planet plaza plucky plum pocket poem polar
pony popcorn potato prism proud pumpkin puzzle quartz quest quick quiet quill rabbit raccoon radar radio rainbow
rapid raven recipe reef rhythm ribbon river robin robot rocket rodeo rose ruby rustic saddle safari salmon
sandal saturn scarf scooter shadow shark shell shiny sierra silky silver sketch sky sled sleepy slope smoke
smooth snail snowy sonic spark sphinx spider spinach sponge spruce squid stable star statue storm sturdy sugar
summit sunny sunset swamp sweater swift syrup tablet taco tango temple tennis thunder ticket tidy tiger timber
tiny toast tomato topaz torch tornado tractor trail tulip tundra turtle tuxedo umbrella unicorn urban valley
vanilla velvet violin visor vivid volcano voyage waffle wagon walnut walrus water whale whistle willow window
winter witty wizard wombat yacht yellow yoga yogurt zebra zenith zero zesty zigzag
almond antler apricot artist aspen ballet balloon banner barrel beaver biscuit blizzard bonfire bramble
breadth buckle burrito butterfly cabbage caramel cardinal cashew catalog cavern chapel cheetah chestnut
chipmunk cinnamon clarinet climber cobweb compost cookie cradle crumble cupboard dancer dentist diesel
dimple dinosaur doorbell dumpling eggplant elephant elevator envelope espresso fairy ferret firefly flamingo
flower freckle gadget gallery garnet glimmer goose granola grizzly hamster hedgehog hammock harmony horizon
iceberg inkwell jasmine jukebox juniper kangaroo keyboard kiwi lavender lemonade library lighthouse lullaby
macaroni mammoth marmalade meerkat midnight mongoose moonbeam mushroom napkin nebula nutmeg octopus orange
ostrich pancake panther paprika passport peacock penguin pepperoni pinecone pistachio platypus porcupine
pretzel puffin quokka radish raisin reindeer rhubarb riddle saffron sapphire scallop seashell snowflake
sparrow squirrel starfish strawberry sunflower teapot telescope thimble toucan treehouse trumpet turnip
twilight vulture walkway wildcat woodland
`;
  const WORDLIST = [...new Set(RAW.trim().split(/\s+/))];

  if (typeof module === 'object' && module.exports) module.exports = WORDLIST;
  else global.WORDLIST = WORDLIST;
})(globalThis);
