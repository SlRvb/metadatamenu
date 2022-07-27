## Metadata Menu
This plugin adds context menu items to modifiy target note's frontmatter properties and "inline fields" (dataview syntax) by right-clicking on the link
The preset values for those properties can be managed globally in the plugin's settings or on a file-by-file basis thanks to fileClass definition
It also enables frontmatter of inline-field autocompletion with suggested values based on preset values.

---
## **BREAKING CHANGE IN 0.1.3**
The recently added feature "fieldWithMenu" has been replaced by "fieldModifyer"
This feature enables to modify the value of a YAML property or a dv inline field directly from a dataview table
It is now async so it should be awaited (see section "Dataview field modifier with dataviewJS" below)

---

## Field autocompletion
type ":" after a field in frontmatter, or "::" after an inline-field to trigger the autocompletion

## link and file options
Right click on a link will automatically display an item per target note's frontmatter property and "inline fields" (dataview syntax)

these options are accessible from:
- the context menu of a link, 
- the context menu of a calendar day, 
- the context menu of a file in the file explorer,
- the "more options" menu of a file
- the command palette "Cmd+P" or by typing the hotkey Alt+O (can be customized in hotkeys settings) 

### Update text property

1. Right-click on the link
2. Click on "Update .... " to change the property's value
3. Change the value in the modal's prompt
4. Type `enter` to save or click X or `esc` to cancel

NB: if you have the `natural language dates` plugin installed, you can type the target date in natural langage and toggle the 📆 selector to automatically convert the input into a link towards the daily note

demo: 
https://youtu.be/qhtPKstdnhI

### Update boolean property

1. Right-click on the link
1. Click on `✅ ▷ ❌` or `❌ ▷ ✅` depending on the value of the boolean to change the value

demo: 
https://youtu.be/iwL-HqvoNOs

### Update multiple values property

1. Right-click on the link
1. Change values comma-separated
1. Press `enter`, the values will be displayed as an array of values in the target note's frontmatter property

**this doesn't work with indented lists YAML format**

demo:
https://youtu.be/WaW6xElq0T4

### Preset values for property

1. Add a new Property Manager in the settings
2. Enter the property name
3. Add preset values (you can order them once the property has been created)

Back in a note Right-click on the link

4. Click on "Update .... " to change the property's value
5. The modal will display a dropdown list with preset values
6. Change the value in the modal's dropdown
7. Click on the save button to save or click X or `esc` to cancel

demo:
https://youtu.be/GryvvJ6qIg4

### Multi select preset values for property

1. In the settings, follow the steps 1 to 3 of previous section
2. Toggle the `isMulti` switch

Back in a note Right-click on the link

3. Click on "Update .... " to change the property's value
4. The modal will display a grid of switches for preset values
5. Change the values by toggling the switches in the modal
6. Click on the save button to save or click X or `esc` to cancel

demo:
https://youtu.be/iyIG6LmCcuc

### Cycle through preset values

1. In the settings, follow the steps 1 to 3 of previous section
2. Toggle the `isCycle` switch

Back in a note Right-click on the link

3. Click on " .. > .. " to change the property's value for the next one in the settings list

demo:
https://youtu.be/7BqG4sG15jc

### Add a new property at section

1. Right-click on the link
2. Click on "Add field at section"
3. Select the line in the target file where you want to insert the new field
4. Select the field
5. Select/input the value for this field (if the field has preset values, you will be prompted to choose one)

demo:
https://youtu.be/JYURK2CM3Es

## Manage Authorized / Ignored fields

### Disable field options in context menu

In the settings

1. toggle "display field option in context menu"
If toggled on, the context menu will include field options
If toggled off, the context menu wont include field options

demo:
https://youtu.be/PC3MC0CfG0E

### Ignore fields globally

In the settings

1. Add the fields you don't want to see in your context menu, comma separated

demo:
https://youtu.be/eFkxECqBvvY

## Manage preset values based on the context of a file (fileClass)

### Define a class for a file and authorized fields for this class

a class file is basically a simple note
the name of the file will be the name of the class
the lines of the file will be the fields managed for this class

1. Define the folder where you want to store your class files
2. Create a note in this folder, let's say `music.md`, containing lines with the name of fields that you want to manage for this class
```md
music.md
=========
genre
difficulty
artist
tone
```
3. In a regular note, let's say `Black Dog.md`, insert a frontmatter field named `fileClass`
4. The value of `fileClass` has to be the name of the file Class where you have the fields that you want to manage for this note. e.g in our case
```yaml
---
fileClass: music
---
```
5. when right-clicking on a link to `Black Dog.md`, the fields in the context menu will be filter to show only the ones that are also included in `music.md`

demo:
https://youtu.be/Av7DeYZILUk

### Define preset values for a class

You can specify the type of an attribute in a fileClass, and its options. Type and Options are called "attributes settings"

Type can be one of:
- "input" (default) : this field can take any value
- "select" : this field can take one value out of a list of items preset in options (see below)
- "multi" : this field can take 0,1 or multiple values out of a list of items preset in options (see below)
- "cycle" : this field can take one value that can "progress" within a list of items preset in options (see below)
- "boolean": this field can be true or false

Options is an array of options

An attribute settings is written in JSON and must be written as a value of and "inline (dataview) field"

example: Say you want to set "genre" attribute in `music.md` fileClass as a "multi" with "rock", "pop" and "jazz" as options, and you want to set "difficulty", "artist" and "tone" as fields that can take any value, your `music.md` will look like this:

```md
music.md
=========
genre:: {"type":"multi", "options":["rock", "pop", "jazz"]}
difficulty
artist
tone
```

NB: "input" type attributes dont need a setting, leaving the name of the attribute only will categorize this attribute automatically as an "input" type.

Because it can be overwhelming to remember this syntax, you can manage "type" and "options" for each fields from:
- the context menu of a note that has this fileClass as a frontmatter's fileClass attribute : click on [`⚙️ Manage <music> fields`] for `music.md` from any file with `fileClass: music` set in frontmatter
- the more-options menu of a fileClass file
- a command within a fileClass file (`alt+P`)

demo:
https://youtu.be/U0Bo_x1B2TM

## Api

API is accessible with `app.plugins.plugins["metadata-menu"].api`

### getValues

`getValues(app: App, file: TFile, attribute: string)`

Takes a TFile containing the field and a string for the related field name

Returns an array with the values of the field

This is an asynchronous function, so you should await it.

### replaceValues
`replaceValues(app: App, file: TFile, attribute: string, input: string)`

Takes a TFile containing the field, a string for the related field name, a new value for this field and updates the field with the new value

This is an asynchronous function, so you should await it.

`fieldModifier(dv: any, p: any, fieldName: string)`

Takes a dataview api instance, a page and a field name and return a HTML element to modify the value of the field in the target note
This is async and should be awaited

## Dataview field modifier with dataviewJS

using `fieldModifier`function included in metadata-menu API, you can build modifiable fields within dataview table

example

```dataviewjs
const {fieldModifier: f} = this.app.plugins.plugins["metadata-menu"].api // destruct metadata-menu api to use fieldWithMeby function and give an alias: "_"

dv.table(["file", "status", "started"], 
    await Promise.all(                // await all modifier to resolve their promise
        dv.pages()
        .limit(10)
        .map(p => [
            p.file.link, 
            await f(dv, p, "status")  // pass dv (dataview api instance), p (the page), and the field name to fieldModifier (: "f")
            await f(dv, p, "started") // pass dv (dataview api instance), p (the page), and the field name to fieldModifier (: "f")
            ])
    )
)
```

when hovering the field you will get a 🖍 button
when clicking the button, an input field will replace the value. you can type a new value
- type escape or click the ❌ button : the input will be replaced by the initial value
- type enter or click the ✅ button: the initial value will be replaced by the input value in the target note and the inpu field will be replaced by the value




## Roadmap
- [ ] manage indented lists multi-values frontmatter property

## Know Issue
- autocomplete conflicts with Various Complements plugin