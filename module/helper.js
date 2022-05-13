import { ATTRIBUTE_TYPES } from "./constants.js";

export class EntitySheetHelper {

    static getAttributeData(data) {

        // Determine attribute type.
        for ( let attr of Object.values(data.data.attributes) ) {
            if ( attr.dtype ) {
                attr.isCheckbox = attr.dtype === "Boolean";
                attr.isResource = attr.dtype === "Resource";
                attr.isFormula = attr.dtype === "Formula";
            }
        }

        // Initialize ungrouped attributes for later.
        data.data.ungroupedAttributes = {};

        // Build an array of sorted group keys.
        const groups = data.data.groups || {};
        let groupKeys = Object.keys(groups).sort((a, b) => {
            let aSort = groups[a].label ?? a;
            let bSort = groups[b].label ?? b;
            return aSort.localeCompare(bSort);
        });

        // Iterate over the sorted groups to add their attributes.
        for ( let key of groupKeys ) {
            let group = data.data.attributes[key] || {};

            // Initialize the attributes container for this group.
            if ( !data.data.groups[key]['attributes'] ) data.data.groups[key]['attributes'] = {};

            // Sort the attributes within the group, and then iterate over them.
            Object.keys(group).sort((a, b) => a.localeCompare(b)).forEach(attr => {
                // Avoid errors if this is an invalid group.
                if ( typeof group[attr] != "object" || !group[attr]) return;
                // For each attribute, determine whether it's a checkbox or resource, and then add it to the group's attributes list.
                group[attr]['isCheckbox'] = group[attr]['dtype'] === 'Boolean';
                group[attr]['isResource'] = group[attr]['dtype'] === 'Resource';
                group[attr]['isFormula'] = group[attr]['dtype'] === 'Formula';
                data.data.groups[key]['attributes'][attr] = group[attr];
            });
        }

        // Sort the remaining attributes attributes.
        Object.keys(data.data.attributes).filter(a => !groupKeys.includes(a)).sort((a, b) => a.localeCompare(b)).forEach(key => {
            data.data.ungroupedAttributes[key] = data.data.attributes[key];
        });

        // Modify attributes on items.
        if ( data.items ) {
            data.items.forEach(item => {
                // Iterate over attributes.
                for ( let [k, v] of Object.entries(item.data.attributes) ) {
                    // Grouped attributes.
                    if ( !v.dtype ) {
                        for ( let [gk, gv] of Object.entries(v) ) {
                            if ( gv.dtype ) {
                                // Add label fallback.
                                if ( !gv.label ) gv.label = gk;
                                // Add formula bool.
                                if ( gv.dtype === "Formula" ) {
                                    gv.isFormula = true;
                                }
                                else {
                                    gv.isFormula = false;
                                }
                            }
                        }
                    }
                    // Ungrouped attributes.
                    else {
                        // Add label fallback.
                        if ( !v.label ) v.label = k;
                        // Add formula bool.
                        if ( v.dtype === "Formula" ) {
                            v.isFormula = true;
                        }
                        else {
                            v.isFormula = false;
                        }
                    }
                }
            });
        }
    }

    /* -------------------------------------------- */

    /** @override */
    static onSubmit(event) {
        // Closing the form/sheet will also trigger a submit, so only evaluate if this is an event.
        if ( event.currentTarget ) {
            // Exit early if this isn't a named attribute.
            if ( (event.currentTarget.tagName.toLowerCase() === 'input') && !event.currentTarget.hasAttribute('name')) {
                return false;
            }

            let attr = false;
            // If this is the attribute key, we need to make a note of it so that we can restore focus when its recreated.
            const el = event.currentTarget;
            if ( el.classList.contains("attribute-key") ) {
                let val = el.value;
                let oldVal = el.closest(".attribute").dataset.attribute;
                let attrError = false;
                // Prevent attributes that already exist as groups.
                let groups = document.querySelectorAll('.group-key');
                for ( let i = 0; i < groups.length; i++ ) {
                    if (groups[i].value === val) {
                        ui.notifications.error(game.i18n.localize("battlehammer.NotifyAttrDuplicate") + ` (${val})`);
                        el.value = oldVal;
                        attrError = true;
                        break;
                    }
                }
                // Handle value and name replacement otherwise.
                if ( !attrError ) {
                    oldVal = oldVal.includes('.') ? oldVal.split('.')[1] : oldVal;
                    attr = $(el).attr('name').replace(oldVal, val);
                }
            }

            // Return the attribute key if set, or true to confirm the submission should be triggered.
            return attr ? attr : true;
        }
    }

    /* -------------------------------------------- */

    /**
     * Listen for click events on an attribute control to modify the composition of attributes in the sheet
     * @param {MouseEvent} event        The originating left click event
     */
    static async onClickAttributeControl(event) {
        event.preventDefault();
        const a = event.currentTarget;
        const action = a.dataset.action;
        switch ( action ) {
            case "create":
                return EntitySheetHelper.createAttribute(event, this);
            case "delete":
                return EntitySheetHelper.deleteAttribute(event, this);
        }
    }

    /* -------------------------------------------- */

    /**
     * Listen for click events and modify attribute groups.
     * @param {MouseEvent} event        The originating left click event
     */
    static async onClickAttributeGroupControl(event) {
        event.preventDefault();
        const a = event.currentTarget;
        const action = a.dataset.action;
        switch ( action ) {
            case "create-group":
                return EntitySheetHelper.createAttributeGroup(event, this);
            case "delete-group":
                return EntitySheetHelper.deleteAttributeGroup(event, this);
        }
    }

    /* -------------------------------------------- */

    /**
     * Listen for the roll button on attributes.
     * @param {MouseEvent} event        The originating left click event
     */
    static onAttributeRoll(event) {
        event.preventDefault();
        const button = event.currentTarget;
        const label = button.closest(".attribute").querySelector(".attribute-label")?.value;
        const chatLabel = label ?? button.parentElement.querySelector(".attribute-key").value;
        const shorthand = game.settings.get("battlehammer", "macroShorthand");

        // Use the actor for rollData so that formulas are always in reference to the parent actor.
        const rollData = this.actor.getRollData();
        let formula = button.closest(".attribute").querySelector(".attribute-value")?.value;

        // If there's a formula, attempt to roll it.
        if ( formula ) {
            let replacement = null;
            if ( formula.includes('@item.') && this.item ) {
                let itemName = this.item.name.slugify({strict: true}); // Get the machine safe version of the item name.
                replacement = !!shorthand ? `@items.${itemName}.` : `@items.${itemName}.attributes.`;
                formula = formula.replace('@item.', replacement);
            }

            // Create the roll and the corresponding message
            let r = new Roll(formula, rollData);
            return r.toMessage({
                user: game.user.id,
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: `${chatLabel}`
            });
        }
    }

    /* -------------------------------------------- */

    /**
     * Return HTML for a new attribute to be applied to the form for submission.
     *
     * @param {Object} items    Keyed object where each item has a "type" and "value" property.
     * @param {string} index    Numeric index or key of the new attribute.
     * @param {string|boolean} group String key of the group, or false.
     *
     * @returns {string} Html string.
     */
    static getAttributeHtml(items, index, group = false) {
        // Initialize the HTML.
        let result = '<div style="display: none;">';
        // Iterate over the supplied keys and build their inputs (including whether or not they need a group key).
        for (let [key, item] of Object.entries(items)) {
            result = result + `<input type="${item.type}" name="data.attributes${group ? '.' + group : '' }.attr${index}.${key}" value="${item.value}"/>`;
        }
        // Close the HTML and return.
        return result + '</div>';
    }

    /* -------------------------------------------- */

    /**
     * Validate whether or not a group name can be used.
     * @param {string} groupName        The candidate group name to validate
     * @param {Document} document     The Actor or Item instance within which the group is being defined
     * @returns {boolean}
     */
    static validateGroup(groupName, document) {
        let groups = Object.keys(document.data.data.groups || {});
        let attributes = Object.keys(document.data.data.attributes).filter(a => !groups.includes(a));

        // Check for duplicate group keys.
        if ( groups.includes(groupName) ) {
            ui.notifications.error(game.i18n.localize("battlehammer.NotifyGroupDuplicate") + ` (${groupName})`);
            return false;
        }

        // Check for group keys that match attribute keys.
        if ( attributes.includes(groupName) ) {
            ui.notifications.error(game.i18n.localize("battlehammer.NotifyGroupAttrDuplicate") + ` (${groupName})`);
            return false;
        }

        // Check for whitespace or periods.
        if ( groupName.match(/[\s|\.]/i) ) {
            ui.notifications.error(game.i18n.localize("battlehammer.NotifyGroupAlphanumeric"));
            return false;
        }
        return true;
    }

    /* -------------------------------------------- */

    /**
     * Create new attributes.
     * @param {MouseEvent} event        The originating left click event
     * @param {Object} app                    The form application object.
     * @private
     */
    static async createAttribute(event, app) {
        const a = event.currentTarget;
        const group = a.dataset.group;
        let dtype = a.dataset.dtype;
        const attrs = app.object.data.data.attributes;
        const groups = app.object.data.data.groups;
        const form = app.form;

        // Determine the new attribute key for ungrouped attributes.
        let objKeys = Object.keys(attrs).filter(k => !Object.keys(groups).includes(k));
        let nk = Object.keys(attrs).length + 1;
        let newValue = `attr${nk}`;
        let newKey = document.createElement("div");
        while ( objKeys.includes(newValue) ) {
            ++nk;
            newValue = `attr${nk}`;
        }

        // Build options for construction HTML inputs.
        let htmlItems = {
            key: {
                type: "text",
                value: newValue
            }
        };

        // Grouped attributes.
        if ( group ) {
            objKeys = attrs[group] ? Object.keys(attrs[group]) : [];
            nk = objKeys.length + 1;
            newValue = `attr${nk}`;
            while ( objKeys.includes(newValue) ) {
                ++nk;
                newValue =    `attr${nk}`;
            }

            // Update the HTML options used to build the new input.
            htmlItems.key.value = newValue;
            htmlItems.group = {
                type: "hidden",
                value: group
            };
            htmlItems.dtype = {
                type: "hidden",
                value: dtype
            };
        }
        // Ungrouped attributes.
        else {
            // Choose a default dtype based on the last attribute, fall back to "String".
            if (!dtype) {
                let lastAttr = document.querySelector('.attributes > .attributes-group .attribute:last-child .attribute-dtype')?.value;
                dtype = lastAttr ? lastAttr : "String";
                htmlItems.dtype = {
                    type: "hidden",
                    value: dtype
                };
            }
        }

        // Build the form elements used to create the new grouped attribute.
        newKey.innerHTML = EntitySheetHelper.getAttributeHtml(htmlItems, nk, group);

        // Append the form element and submit the form.
        newKey = newKey.children[0];
        form.appendChild(newKey);
        await app._onSubmit(event);
    }

    /**
     * Delete an attribute.
     * @param {MouseEvent} event        The originating left click event
     * @param {Object} app                    The form application object.
     * @private
     */
    static async deleteAttribute(event, app) {
        const a = event.currentTarget;
        const li = a.closest(".attribute");
        if ( li ) {
            li.parentElement.removeChild(li);
            await app._onSubmit(event);
        }
    }

    /* -------------------------------------------- */

    /**
     * Create new attribute groups.
     * @param {MouseEvent} event        The originating left click event
     * @param {Object} app                    The form application object.
     * @private
     */
    static async createAttributeGroup(event, app) {
        const a = event.currentTarget;
        const form = app.form;
        let newValue = $(a).siblings('.group-prefix').val();
        // Verify the new group key is valid, and use it to create the group.
        if ( newValue.length > 0 && EntitySheetHelper.validateGroup(newValue, app.object) ) {
            let newKey = document.createElement("div");
            newKey.innerHTML = `<input type="text" name="data.groups.${newValue}.key" value="${newValue}"/>`;
            // Append the form element and submit the form.
            newKey = newKey.children[0];
            form.appendChild(newKey);
            await app._onSubmit(event);
        }
    }

    /* -------------------------------------------- */

    /**
     * Delete an attribute group.
     * @param {MouseEvent} event        The originating left click event
     * @param {Object} app                    The form application object.
     * @private
     */
    static async deleteAttributeGroup(event, app) {
        const a = event.currentTarget;
        let groupHeader = a.closest(".group-header");
        let groupContainer = groupHeader.closest(".group");
        let group = $(groupHeader).find('.group-key');
        // Create a dialog to confirm group deletion.
        new Dialog({
            title: game.i18n.localize("battlehammer.DeleteGroup"),
            content: `${game.i18n.localize("battlehammer.DeleteGroupContent")} <strong>${group.val()}</strong>`,
            buttons: {
                confirm: {
                    icon: '<i class="fas fa-trash"></i>',
                    label: game.i18n.localize("Yes"),
                    callback: async () => {
                        groupContainer.parentElement.removeChild(groupContainer);
                        await app._onSubmit(event);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("No"),
                }
            }
        }).render(true);
    }

    /* -------------------------------------------- */

    /**
     * Update attributes when updating an actor object.
     * @param {object} formData             The form data object to modify keys and values for.
     * @param {Document} document         The Actor or Item document within which attributes are being updated
     * @returns {object}                            The updated formData object.
     */
    static updateAttributes(formData, document) {
        let groupKeys = [];

        // Handle the free-form attributes list
        const formAttrs = foundry.utils.expandObject(formData)?.data?.attributes || {};
        const attributes = Object.values(formAttrs).reduce((obj, v) => {
            let attrs = [];
            let group = null;
            // Handle attribute keys for grouped attributes.
            if ( !v["key"] ) {
                attrs = Object.keys(v);
                attrs.forEach(attrKey => {
                    group = v[attrKey]['group'];
                    groupKeys.push(group);
                    let attr = v[attrKey];
                    let k = v[attrKey]["key"] ? v[attrKey]["key"].trim() : attrKey.trim();
                    if ( /[\s\.]/.test(k) )    return ui.notifications.error("Attribute keys may not contain spaces or periods");
                    delete attr["key"];
                    // Add the new attribute if it's grouped, but we need to build the nested structure first.
                    if ( !obj[group] ) {
                        obj[group] = {};
                    }
                    obj[group][k] = attr;
                });
            }
            // Handle attribute keys for ungrouped attributes.
            else {
                let k = v["key"].trim();
                if ( /[\s\.]/.test(k) )    return ui.notifications.error("Attribute keys may not contain spaces or periods");
                delete v["key"];
                // Add the new attribute only if it's ungrouped.
                if ( !group ) {
                    obj[k] = v;
                }
            }
            return obj;
        }, {});

        // Remove attributes which are no longer used
        for ( let k of Object.keys(document.data.data.attributes) ) {
            if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
        }

        // Remove grouped attributes which are no longer used.
        for ( let group of groupKeys) {
            if ( document.data.data.attributes[group] ) {
                for ( let k of Object.keys(document.data.data.attributes[group]) ) {
                    if ( !attributes[group].hasOwnProperty(k) ) attributes[group][`-=${k}`] = null;
                }
            }
        }

        // Re-combine formData
        formData = Object.entries(formData).filter(e => !e[0].startsWith("data.attributes")).reduce((obj, e) => {
            obj[e[0]] = e[1];
            return obj;
        }, {_id: document.id, "data.attributes": attributes});

        return formData;
    }

    /* -------------------------------------------- */

    /**
     * Update attribute groups when updating an actor object.
     * @param {object} formData             The form data object to modify keys and values for.
     * @param {Document} document         The Actor or Item document within which attributes are being updated
     * @returns {object}                            The updated formData object.
     */
    static updateGroups(formData, document) {
        // Handle the free-form groups list
        const formGroups = expandObject(formData).data.groups || {};
        const groups = Object.values(formGroups).reduce((obj, v) => {
            // If there are duplicate groups, collapse them.
            if ( Array.isArray(v["key"]) ) {
                v["key"] = v["key"][0];
            }
            // Trim and clean up.
            let k = v["key"].trim();
            if ( /[\s\.]/.test(k) )    return ui.notifications.error("Group keys may not contain spaces or periods");
            delete v["key"];
            obj[k] = v;
            return obj;
        }, {});

        // Remove groups which are no longer used
        for ( let k of Object.keys(document.data.data.groups) ) {
            if ( !groups.hasOwnProperty(k) ) groups[`-=${k}`] = null;
        }

        // Re-combine formData
        formData = Object.entries(formData).filter(e => !e[0].startsWith("data.groups")).reduce((obj, e) => {
            obj[e[0]] = e[1];
            return obj;
        }, {_id: document.id, "data.groups": groups});
        return formData;
    }

    /* -------------------------------------------- */

    /**
     * @see ClientDocumentMixin.createDialog
     */
    static async createDialog(data={}, options={}) {

        // Collect data
        const documentName = this.metadata.name;
        const folders = game.folders.filter(f => (f.data.type === documentName) && f.displayed);
        const label = game.i18n.localize(this.metadata.label);
        const title = game.i18n.format("DOCUMENT.Create", {type: label});

        // Identify the template Actor types
        const collection = game.collections.get(this.documentName);
        const templates = collection.filter(a => a.getFlag("battlehammer", "isTemplate"));
        const defaultType = this.metadata.types[0];
        const types = {
            [defaultType]: game.i18n.localize("battlehammer.NoTemplate")
        }
        for ( let a of templates ) {
            types[a.id] = a.name;
        }

        // Render the document creation form
        const useEntity = game.battlehammer.useEntity;
        const template = `templates/sidebar/${useEntity ? "entity" : "document" }-create.html`;
        const html = await renderTemplate(template, {
            name: data.name || game.i18n.format("DOCUMENT.New", {type: label}),
            folder: data.folder,
            folders: folders,
            hasFolders: folders.length > 1,
            type: data.type || templates[0]?.id || "",
            types: types,
            hasTypes: true
        });

        // Render the confirmation dialog window
        return Dialog.prompt({
            title: title,
            content: html,
            label: title,
            callback: html => {

                // Get the form data
                const form = html[0].querySelector("form");
                const fd = new FormDataExtended(form);
                let createData = fd.toObject();

                // Merge with template data
                const template = collection.get(form.type.value);
                if ( template ) {
                    createData = foundry.utils.mergeObject(template.toObject(), createData);
                    createData.type = template.data.type;
                    delete createData.flags.battlehammer.isTemplate;
                }

                // Merge provided override data
                createData = foundry.utils.mergeObject(createData, data);
                return this.create(createData, {renderSheet: true});
            },
            rejectClose: false,
            options: options
        });
    }
}


// =================================================================================

export default class Helpers {
  
    /**
     * Verifies server path exists, and if it doesn't creates it.
     * 
     * @param  {string} startingSource - Source
     * @param  {string} path - Server path to verify
     * @returns {boolean} - true if verfied, false if unable to create/verify
     */
    static async verifyPath(startingSource, path) {
      try {
        const paths = path.split("/");
        let currentSource = paths[0];
  
        for(let i = 0; i < paths.length; i+=1) {
          try {
            if(currentSource !== paths[i]) {
              currentSource = `${currentSource}/${paths[i]}`; 
            }
            await Helpers.CreateDirectory(startingSource,`${currentSource}`, {bucket:null});
            
          } catch (err) {
            Helpers.logger.debug(`Error trying to verify path ${startingSource}, ${path}`, err);
          }
        }
      } catch (err) {
        return false;
      }
  
      return true;
    }
    
    /**
     * Exports data structure to json string
     * 
     * @param  {object} data - data to stringify
     * @returns {string} - stringified data
     */
    static exportToJSON(data) {
      const exportData = duplicate(data);
      delete data.permission;
  
      // if this object has a souce include it.
      if(data.flags?.["exportSource"]) {
        data.flags["exportSource"] = {
          world: game.world.id,
          system: game.system.id,
          coreVersion: game.data.version,
          systemVersion: game.system.data.version
        };
      }
      
      return JSON.stringify(data, null, "\t");
    }
  
  
    static sanitizeFilename(input, replacement) {
      var illegalRe = /[\/\?<>\\:\*\|"]/g;
      var controlRe = /[\x00-\x1f\x80-\x9f]/g;
      var reservedRe = /^\.+$/;
      var windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
      var windowsTrailingRe = /[\. ]+$/;
  
      if (typeof input !== 'string') {
        throw new Error('Input must be string');
      }
      var sanitized = input
        .replace(illegalRe, replacement)
        .replace(controlRe, replacement)
        .replace(reservedRe, replacement)
        .replace(windowsReservedRe, replacement)
        .replace(windowsTrailingRe, replacement);
      return sanitized;
    }
    
    /**
     * Exports binary file to zip file within a specific folder, excludes files in core data area
     * 
     * @param  {string} path - Path to file within VTT
     * @param  {string} type - Object type
     * @param  {string} id - Object Id
     * @param  {object} zip - Zip archive
     * @param  {string} imageType="images" - image/file type for folder name
     * @returns {string} - Path to file within zip file
     */
    static async exportImage(itempath, type, id, zip, imageType="images") {
      if(itempath) {
        let path = decodeURI(itempath);
  
        if(CONFIG.VASSALIMPORT.TEMPORARY[itempath]) {
          return CONFIG.VASSALIMPORT.TEMPORARY[itempath];
        } else {
          let isDataImage = true;
          try {
            const img = await JSZipUtils.getBinaryContent(itempath);
            const filename = path.replace(/^.*[\\\/]/, '')
    
            await zip.folder(type).folder(imageType).folder(id).file(filename, img, {binary:true});
            CONFIG.VASSALIMPORT.TEMPORARY[itempath] = `${type}/${imageType}/${id}/${filename}`;
            return `${type}/${imageType}/${id}/${filename}`;
          } catch (err) {
            Helpers.logger.debug(`Warning during ${imageType} export. ${itempath} is not in the data folder or could be a core image.`);
          }
        }
       
        return `*${path}`;
      }
    }
    
    /**
     * Imports binary file, by extracting from zip file and uploading to path.
     * 
     * @param  {string} path - Path to image within zip file
     * @param  {object} zip - Zip file
     * @returns {string} - Path to file within VTT
     */
    static async importImage(path, zip, adventure) {
      try {
        if(path[0] === "*") {
          // this file was flagged as core data, just replace name.
          return path.replace(/\*/g, "");
        } else {
          let adventurePath = (adventure.name).replace(/[^a-z0-9]/gi, '_');
          if(!CONFIG.VASSALIMPORT.TEMPORARY.import[path]) {
            let filename = path.replace(/^.*[\\\/]/, '').replace(/\?(.*)/, '');
            
              await Helpers.verifyPath("data", `worlds/${game.world.name}/vassal/${adventurePath}/${path.replace(filename, "")}`);
            const img = await zip.file(path).async("uint8array");
            const i = new File([img], filename);
              await Helpers.UploadFile("data", `worlds/${game.world.name}/vassal/${adventurePath}/${path.replace(filename, "")}`, i, { bucket: null })
            CONFIG.VASSALIMPORT.TEMPORARY.import[path] = true;
          } else {
            Helpers.logger.debug(`File already imported ${path}`);  
          }
          
          return `worlds/${game.world.id}/vassal/${adventurePath}/${path}`;
        }
      } catch (err) {
        Helpers.logger.error(`Error importing image file ${path} : ${err.message}`);
      }
  
      return path;
    }
    
    /**
     * Async for each loop
     * 
     * @param  {array} array - Array to loop through
     * @param  {function} callback - Function to apply to each array item loop
     */
    static async asyncForEach(array, callback) {
      for (let index = 0; index < array.length; index += 1) {
        await callback(array[index], index, array);
      }
    };
  
    /**
     * Attempts to find a compendium pack by name, if not found, create a new one based on item type
     * @param  {string} type - Type of compendium
     * @param  {string} name - Name of compendium
     * @returns {object} - Compendium pack
     */
    static async getCompendiumPack(type, name) {
      let pack = game.packs.find(p => {
        return p.metadata.label === name
      });
      
      if(!pack) {
        pack = await Compendium.create({ entity : type, label: name});
      }
  
      return pack;
    }
    
    /**
     * Find an entity by the import key.
     * @param  {string} type - Entity type to search for
     * @param  {string} id - Entity Id 
     * @returns {object} - Entity Object Data
     */
    static findEntityByImportId(type, id) {
      return game.data[type].find(item => {
        return item.flags.importid === id;
      });
    }
    
    /**
     * Converts and object into an update object for entity update function
     * @param  {object} newItem - Object data
     * @returns {object} - Entity Update Object
     */
    static buildUpdateData = (newItem) => {
      let updateData = {};
  
      for(let key in newItem) {
        const recursiveObject = (itemkey, obj) => {
          for(let objkey in obj) {
            if(typeof obj[objkey] === "object") {
              recursiveObject(`${itemkey}.${objkey}`, obj[objkey]);
            } else {
              if(obj[objkey]) {
                const datakey = `${itemkey}.${objkey}`;
                updateData[datakey] = obj[objkey];
              }
            }
          }
        }
  
        if(typeof newItem[key] === "object") {
          recursiveObject(key, newItem[key]);
        } else {
          const datakey = `${key}`;
          updateData[datakey] = `${newItem[key]}`
        }
      }
      return updateData
    }
  
    
    /**
     * Async replace for all matching patterns
     * 
     * @param  {string} str - Original string to replace values in
     * @param  {string} regex - regex for matching
     * @param  {function} asyncFn - async function to run on each match
     * @returns {string} 
     */
    static async replaceAsync(str, regex, asyncFn) {
      const promises = [];
      str.replace(regex, (match, ...args) => {
          const promise = asyncFn(match, ...args);
          promises.push(promise);
      });
      const data = await Promise.all(promises);
      return str.replace(regex, () => data.shift());
  }
  
    /**
     * Returns the difference between object 1 and 2
     * @param  {object} obj1
     * @param  {object} obj2
     * @returns {object}
     */
    static diff(obj1, obj2) {
      var result = {};
      for(const key in obj1) {
          if(obj2[key] != obj1[key]) result[key] = obj2[key];
          if(typeof obj2[key] == 'array' && typeof obj1[key] == 'array') 
              result[key] = this.diff(obj1[key], obj2[key]);
          if(typeof obj2[key] == 'object' && typeof obj1[key] == 'object') 
              result[key] = this.diff(obj1[key], obj2[key]);
      }
      return result;
    }
  
    /**
     * Read data from a user provided File object
     * @param {File} file           A File object
     * @return {Promise.<String>}   A Promise which resolves to the loaded text data
     */
    static readBlobFromFile(file) {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = ev => {
          resolve(reader.result);
        };
        reader.onerror = ev => {
          reader.abort();
          reject();
        };
        reader.readAsBinaryString(file);
      });
    }
  
    static async importFolder(parentFolder, folders, adventure, folderList) {
      let mapping = [];
  
      await this.asyncForEach(folders, async f => {
        let folderData = f;
  
        let newfolder = game.folders.find(folder => {
          return (folder.data._id === folderData._id || folder.data.flags.importid === folderData._id) && folder.data.type === folderData.type;
        });
  
        if(!newfolder) {
          if(folderData.parent !== null) {
            folderData.parent = CONFIG.VASSALIMPORT.TEMPORARY.folders[folderData.parent];
          } else {
            if(adventure?.options?.folders) {
              folderData.parent = CONFIG.VASSALIMPORT.TEMPORARY.folders["null"];
            } else {
              folderData.parent = CONFIG.VASSALIMPORT.TEMPORARY.folders[folderData.type];
            }
          }
  
          newfolder = await Folder.create(folderData);
          Helpers.logger.debug(`Created new folder ${newfolder.data._id} with data:`, folderData, newfolder);
        }
  
        CONFIG.VASSALIMPORT.TEMPORARY.folders[folderData.flags.importid] = newfolder.data._id;
        
        let childFolders = folderList.filter(folder => { return folder.parent === folderData._id });
  
        if(childFolders.length > 0) {
          await this.importFolder(newfolder, childFolders, adventure, folderList);
        } 
      });
    }
  
    /**
     * Uploads a file to Foundry without the UI Notification
     * @param  {string} source
     * @param  {string} path
     * @param  {blog} file
     * @param  {object} options
     */
    static async UploadFile(source, path, file, options) {
      if (typeof ForgeVTT !== "undefined" && ForgeVTT?.usingTheForge) {
        return Helpers.ForgeUploadFile("forgevtt", path, file, options);
      }
  
      const fd = new FormData();
      fd.set("source", source);
      fd.set("target", path);
      fd.set("upload", file);
      Object.entries(options).forEach((o) => fd.set(...o));
  
      const request = await fetch(FilePicker.uploadURL, { method: "POST", body: fd });
      if (request.status === 413) {
        return ui.notifications.error(game.i18n.localize("FILES.ErrorTooLarge"));
      } else if (request.status !== 200) {
        return ui.notifications.error(game.i18n.localize("FILES.ErrorSomethingWrong"));
      }
    }
  
    /**
     * Uploads a file to Forge Asset Library without the UI Notification
     * @param  {string} source
     * @param  {string} path
     * @param  {blog} file
     * @param  {object} options
     */
    static async ForgeUploadFile(source, path, file, options) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("path", `${path}/${file.name}`);
  
      const response = await ForgeAPI.call("assets/upload", fd);
      if (!response || response.error) {
        ui.notifications.error(response ? response.error : "An unknown error occured accessing The Forge API");
        return false;
      } else {
        return { path: response.url };
      }
    }
  
    /**
     * Browse files using FilePicker
     * @param  {string} source
     * @param  {string} target
     * @param  {object} options={}
     */
    static async BrowseFiles(source, target, options = {}) {
      if (typeof ForgeVTT !== "undefined" && ForgeVTT?.usingTheForge) {
        if (target.startsWith(ForgeVTT.ASSETS_LIBRARY_URL_PREFIX)) source = "forgevtt";
  
        if( source === "forgevtt" ) {
          return Helpers.BrowseForgeFiles(source, target, options);
        }
      }
  
      return FilePicker.browse(source, target, options);
    }
  
    /**
     * Browse files using Forge API
     * @param  {string} source
     * @param  {string} target
     * @param  {object} options={}
     */
    static async BrowseForgeFiles(source, target, options = {}) {
      if (target.startsWith(ForgeVTT.ASSETS_LIBRARY_URL_PREFIX)) {
        if (options.wildcard)
            options.wildcard = target;
        target = target.slice(ForgeVTT.ASSETS_LIBRARY_URL_PREFIX.length)
        target = target.split("/").slice(1, -1).join("/") // Remove userid from url to get target path
      }
  
      const response = await ForgeAPI.call('assets/browse', { path: decodeURIComponent(target), options });
      if (!response || response.error) {
          ui.notifications.error(response ? response.error : "An unknown error occured accessing The Forge API");
          return { target, dirs: [], files: [], gridSize: null, private: false, privateDirs: [], extensions: options.extensions }
      }
      // TODO: Should be decodeURIComponent but FilePicker's _onPick needs to do encodeURIComponent too, but on each separate path.
      response.target = decodeURI(response.folder);
      delete response.folder;
      response.dirs = response.dirs.map(d => d.path.slice(0, -1));
      response.files = response.files.map(f => f.url);
      // 0.5.6 specific
      response.private = true;
      response.privateDirs = [];
      response.gridSize = null;
      response.extensions = options.extensions;
      return response;
    }
    /**
     * @param  {string} source
     * @param  {string} target
     * @param  {object} options={}
     */
    static async CreateDirectory(source, target, options = {}) {
      if (typeof ForgeVTT !== "undefined" && ForgeVTT?.usingTheForge) {
        return Helpers.ForgeCreateDirectory("forgevtt", target, options);
      }
      return FilePicker.createDirectory(source, target, options);
    }
  
    static async ForgeCreateDirectory(source, target, options = {}) {
      if (!target) return;
      const response = await ForgeAPI.call('assets/new-folder', { path: target });
      if (!response || response.error)
        throw new Error(response ? response.error : "Unknown error while creating directory.");
    }
  
  
    static stringToXml = (s) => {
        let data = s.replace(/^\uFEFF/, "");
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");
    
        return xmlDoc;
      };

  }