$(document).ready(function() {

    /**
     * Prepare the lock for a original values of a property.
     */
    function prepareFieldLocked(field) {
        var settings = field.data('settings') ? field.data('settings') : {};
        if (settings.locked_value != true) {
            return;
        }

        // Some weird selectors are needed to manage all cases.
        field.find('.inputs .values .value:not(.default-value) .input-body').find('input, select, textarea').addClass('original-value');
        var originalValues = field.find('.input-body .original-value');
        originalValues
            .prop('readonly', 'readonly')
            .attr('readonly', 'readonly');
        originalValues.closest('.input-body').find('.o-icon-close').remove();
        originalValues.closest('.input-body').find('.button.resource-select').remove();
        originalValues.closest('div.value').find('.input-footer .remove-value').remove();

        // Disable some field is required separately: it can be still changed (numeric data type).
        originalValues.filter('[type=checkbox]:not([data-value-key])').attr('disabled', true);
        originalValues.filter('[type=radio]:not([data-value-key])').attr('disabled', true);
        originalValues.filter('select:not([data-value-key])').attr('disabled', true).trigger('chosen:updated');
        // Manage custom vocab with chosen.
        originalValues.filter('select[data-value-key]').each(function() {
            $(this).find('option[value!="' + $(this).val() + '"]').remove()
                .end().chosen('destroy');
        });
    }

    /**
     * Prepare the autocompletion for a property.
     */
    function prepareFieldAutocomplete(field) {
        var templateSettings = $('#resource-values').data('template-settings') ;
        var settings = field.data('settings') ? field.data('settings') : {};

        // Reset autocomplete for all properties.
        $('.inputs .values textarea.input-value').prop('autocomplete', 'off');
        field.removeData('autocomplete');
        field.find('.inputs .values textarea.input-value.autocomplete').each(function() {
            var autocomp = $(this).autocomplete();
            if (autocomp) {
                autocomp.dispose();
            }
        });
        field.find('.inputs .values textarea.input-value').prop('autocomplete', 'off').removeClass('autocomplete');

        var autocomplete = templateSettings.autocomplete ? templateSettings.autocomplete : 'no';
        autocomplete = settings.autocomplete && $.inArray(settings.autocomplete, ['no', 'sw', 'in']) 
            ? settings.autocomplete
            : autocomplete;
        if (autocomplete === 'sw' || autocomplete === 'in') {
            field.data('autocomplete', autocomplete);
            field.find('.inputs .values textarea.input-value').addClass('autocomplete');
            field.find('.inputs .values textarea.input-value.autocomplete').each(initAutocomplete);
        }
    }

    /**
     * Prepare the language for a property.
     */
    function prepareFieldLanguage(field) {
        // Add a specific datalist for the property. It replaces the previous one from another template.
        var templateSettings = $('#resource-values').data('template-settings') ;
        var settings = field.data('settings') ? field.data('settings') : {};
        var listName = 'value-languages';
        var term = field.data('property-term');

        var datalist = $('#value-languages-template');
        if (datalist.length) {
            datalist.empty();
        } else {
            $('#value-languages').after('<datalist id="value-languages-template" class="value-languages"></datalist>');
            datalist = $('#value-languages-template');
        }
        if (templateSettings.value_languages && !$.isEmptyObject(templateSettings.value_languages)) {
            listName = 'value-languages-template';
            $.each(templateSettings.value_languages, function(code, label) {
                datalist.append($('<option>', { value: code, label: label.length ? label : code }));
            });
        }

        datalist = field.find('.values ~ datalist.value-languages');
        if (datalist.length) {
            datalist.empty();
        } else {
            field.find('.values').first().after('<datalist class="value-languages"></datalist>');
            datalist = field.find('.values ~ datalist.value-languages');
            datalist.attr('id', 'value-languages-' + term);
        }
        if (settings.value_languages && !$.isEmptyObject(settings.value_languages)) {
            listName = 'value-languages-' + term;
            $.each(settings.value_languages, function(code, label) {
                datalist.append($('<option>', { value: code, label: label.length ? label : code }));
            });
        }

        // Use the main datalist, or the template one, or the property one.
        var inputLanguage = field.find('.values input.value-language');
        inputLanguage.attr('list', listName);

        var noLanguage = !!(settings.use_language
            && (settings.use_language === 'no' || (settings.use_language !== 'yes' && templateSettings.no_language)));
        field.data('no-language', noLanguage);
        field.find('.inputs .values input.value-language').each(function() {
            initValueLanguage($(this), field);
        });
    }

    /**
     * Init the language input.
     */
    function initValueLanguage(languageInput, field) {
        var languageElement;
        var languageButton = languageInput.prev('a.value-language');
        var language = languageInput.val();
        if (field.data('no-language') == true) {
            language = '';
            languageButton.removeClass('active').addClass('no-language');
            languageInput.prop('disabled', true).removeClass('active');
        } else {
            languageButton.removeClass('no-language');
            languageInput.prop('disabled', false);
            languageElement = languageInput;
        }
        if (language !== '') {
            languageButton.addClass('active');
            languageElement.addClass('active');
        }
    }

    /**
     * Fill the default language.
     */
    function fillDefaultLanguage(value, valueObj, field) {
        value.find('input.value-language').each(function() {
            initValueLanguage($(this), field);
        });

        if (valueObj) {
            return;
        }
        if (field.data('no-language') == true) {
            return;
        }

        var templateSettings = $('#resource-values').data('template-settings');
        var settings = field.data('settings') ? field.data('settings') : {};
        var defaultLanguage = templateSettings.default_language && templateSettings.default_language.length
            ? templateSettings.default_language
            : '';
        defaultLanguage = settings.default_language && settings.default_language.length
            ? settings.default_language
            : defaultLanguage;
        if (defaultLanguage.length) {
            value.find('input.value-language').val(defaultLanguage).addClass('active');
            value.find('a.value-language').addClass('active');
        }
    }

    /**
     * Manage default value.
     *
     * The default value can be a json value, a simple string, an integer, or a uri + a string.
     * @see resource-form.js, same hook (but this one comes after).
     */
    function fillDefaultValue(dataType, value, valueObj, field) {
        var settings = field.data('settings');
        if (!settings
            || !settings.default_value || !settings.default_value.trim().length
            // The value from the object is already managed.
            || valueObj
            // Don't add a value if this is an edition.
            || !$('body').hasClass('add')
            // Don't add a value if there is already a value.
            || field.find('.input-value').length > 0
            || field.find('input.value').length > 0
            || field.find('input.value.to-require').length > 0
            // Custom vocab.
            || field.find('select.terms option').length > 0
            // Numeric data types.
            || field.find('input.numeric-integer-value').length > 0
            // Value suggest.
            || field.find('input.valuesuggest-input').length > 0
        ) {
            return;
        }

        var defaultValue = settings.default_value.trim();
        valueObj = jsonDecodeObject(defaultValue);
        // Manage specific data type "resource".
        if (dataType.startsWith('resource')) {
            if (/^\d+$/.test(defaultValue)) {
                if (!valueObj) {
                    valueObj = {
                        display_title: Omeka.jsTranslate('Resource') + ' #' + defaultValue,
                        value_resource_id: defaultValue,
                        value_resource_name: 'resource',
                        url: '#',
                    };
                }
                value.find('input.value[data-value-key="value_resource_id"]').val(valueObj.value_resource_id);
                // TODO Get the title from the api (when authentication will be opened).
                value.find('span.default').hide();
                var resource = value.find('.selected-resource');
                resource.find('.o-title')
                    .removeClass() // remove all classes
                    .addClass('o-title ' + valueObj['value_resource_name'])
                    .html($('<a>', {href: valueObj['url'], text: valueObj['display_title']}));
                if (typeof valueObj['thumbnail_url'] !== 'undefined') {
                    resource.find('.o-title')
                        .prepend($('<img>', {src: valueObj['thumbnail_url']}));
                }
            }
        }

        // Manage most common default values for other data types.
        if (!valueObj) {
            if (dataType === 'uri' || dataType.startsWith('valuesuggest')) {
                if (defaultValue.match(/^(\S+)\s(.*)/)) {
                    valueObj = defaultValue.match(/^(\S+)\s(.*)/).slice(1);
                    valueObj = {'@id': valueObj[0], 'o:label': valueObj[1]};
                } else {
                    valueObj = {'@id': defaultValue};
                }
            } else {
                valueObj = {'@value': defaultValue};
            }
        }

        // Prepare simple single-value form inputs using data-value-key.
        value.find(':input').each(function () {
            var valueKey = $(this).data('valueKey');
            if (!valueKey) {
                return;
            }
            $(this).removeAttr('name')
                .val(valueObj ? valueObj[valueKey] : null);
        });

        // @see custom-vocab.js
        if (dataType.startsWith('customvocab:')) {
            var selectTerms = value.find('select.terms');
            selectTerms.find('option[value="' + valueObj['@value'] + '"]').prop('selected', true);
            selectTerms.chosen({ width: '100%', });
            selectTerms.trigger('chosen:updated');
        }

        // @see numeric-data-types.js
        if (dataType === 'numeric:integer') {
            var container = value;
            var v = container.find('.numeric-integer-value');
            var int = container.find('.numeric-integer-integer');
            int.val(v.val());
        }

        // Value Suggest is a lot more complex. Sub-trigger value?
        // @see valuesuggest.js
        if (dataType.startsWith('valuesuggest')) {
            var thisValue = value;
            var suggestInput = thisValue.find('.valuesuggest-input');
            var labelInput = thisValue.find('input[data-value-key="o:label"]');
            var idInput = thisValue.find('input[data-value-key="@id"]');
            var valueInput = thisValue.find('input[data-value-key="@value"]');
            // var languageLabel = thisValue.find('.value-language.label');
            var languageInput = thisValue.find('input[data-value-key="@language"]');
            // var languageRemove = thisValue.find('.value-language.remove');
            var idContainer = thisValue.find('.valuesuggest-id-container');

            if (valueObj['o:label']) {
                labelInput.val(valueObj['o:label']);
            }
            if (valueObj['@id']) {
                idInput.val(valueObj['@id']);
            }
            if (valueObj['@value']) {
                valueInput.val(valueObj['@value']);
            }
            if (valueObj['@language']) {
                languageInput.val(valueObj['@language']);
            }

            // Literal is the default type.
            idInput.prop('disabled', true);
            labelInput.prop('disabled', true);
            valueInput.prop('disabled', false);
            idContainer.hide();

            // Set existing values during initial load.
            if (idInput.val()) {
                // Set value as URI type
                suggestInput.val(labelInput.val()).attr('placeholder', labelInput.val());
                idInput.prop('disabled', false);
                labelInput.prop('disabled', false);
                valueInput.prop('disabled', true);
                var link = $('<a>')
                    .attr('href', idInput.val())
                    .attr('target', '_blank')
                    .text(idInput.val());
                idContainer.show().find('.valuesuggest-id').html(link);
            } else if (valueInput.val()) {
                // Set value as Literal type
                suggestInput.val(valueInput.val()).attr('placeholder', valueInput.val());
                idInput.prop('disabled', true);
                labelInput.prop('disabled', true);
                valueInput.prop('disabled', false);
            }
        }
    }

    function initAutocomplete() {
        var searchField = $(this);
        searchField.autocomplete({
            serviceUrl: autocompleteUrl,
            dataType: 'json',
            paramName: 'q',
            params: {
                prop: searchField.closest('.resource-values.field').data('property-id'),
                type: searchField.closest('.resource-values.field').data('autocomplete'),
            }
        });
    }

    function jsonDecodeObject(string) {
        try {
            var obj = JSON.parse(string);
            return obj && typeof obj === 'object' && Object.keys(obj).length ? obj : null;
        } catch (e) {
            return null;
        }
    }

    $(document).on('o:template-applied', 'form.resource-form', function() {
        var fields = $('#properties .resource-values.field');
        fields.each(function(index, field) {
            prepareFieldAutocomplete($(field));
            prepareFieldLanguage($(field));
        });
        if (!$('#resource-values').data('locked-ready')) {
            fields.each(function(index, field) {
                prepareFieldLocked($(field));
            });
            $('#resource-values').data('locked-ready', true);
        }
    });

    $(document).on('o:property-added', '.resource-values.field', function() {
        var field = $(this);
        prepareFieldAutocomplete($(field));
        prepareFieldLanguage(field);
    });

    $(document).on('o:prepare-value', function(e, dataType, value, valueObj) {
        var field = value.closest('.resource-values.field');
        var term = value.data('term');
        if (!field.length) {
            field = $('#properties [data-property-term="' + term + '"].field');
            if (!field.length) {
                return;
            }
        }
        var settings = field.data('settings');
        if (!settings) {
            return;
        }

        if (field.data('autocomplete')) {
            value.find('textarea.input-value').addClass('autocomplete');
            value.find('textarea.input-value.autocomplete').each(initAutocomplete);
        }

        var templateSettings = $('#resource-values').data('template-settings');
        var listName = templateSettings.value_languages && !$.isEmptyObject(templateSettings.value_languages)
            ? 'value-languages-template'
            : 'value-languages';
        listName = settings.value_languages && !$.isEmptyObject(settings.value_languages)
            ? 'value-languages-' + term
            : listName;
        value.find('input.value-language').attr('list', listName);

        fillDefaultLanguage(value, valueObj, field);

        fillDefaultValue(dataType, value, valueObj, field);
    });

    var modal;
    // Append the button to create a new resource.
    $(document).on('o:sidebar-content-loaded', 'body.sidebar-open', function(e) {
        var sidebar = $('#select-resource.sidebar');
        if (sidebar.find('.quick-add-resource').length) {
            return;
        }
        // TODO Determine the resource type in a cleaner way.
        var resourceType = sidebar.find('#item-results').length ? 'item' : null
        if (!resourceType) {
            return;
        }
        var button = `<div data-data-type="resource:${resourceType}">
    <a class="o-icon-${resourceType}s button quick-add-resource" href="${baseUrl + 'admin/' + resourceType}/add?window=modal" target="_blank"> ${Omeka.jsTranslate('New ' + resourceType)}</a>
</div>`;
        sidebar.find('#item-results .search-nav').after(button)
    });
    // Allow to create a new resource in a modal window during edition of another resource.
    $(document).on('click', '.quick-add-resource', function(e) {
        e.preventDefault();
        // Save the modal in local storage to allow recursive new resources.
        var d = new Date();
        var windowName = 'new resource ' + d.getTime();
        var windowFeatures = 'titlebar=no,menubar=no,location=no,resizable=yes,scrollbars=yes,status=yes,directories=no,fullscreen=no,top=90,left=120,width=830,height=700';
        modal = window.open(e.target.href, windowName, windowFeatures);
        window.localStorage.setItem('modal', modal);
        // Check if the modal is closed, then refresh the list of resources.
        var checkSidebarModal = setInterval(function() {
            if (modal && modal.closed) {
                clearInterval(checkSidebarModal);
                // Wait to let Omeka saves the new resource, if any.
                setTimeout(function() {
                    var s = $('#sidebar-resource-search');
                    Omeka.populateSidebarContent(s.closest('.sidebar'), s.data('search-url'), '');
                }, 2000);
            }
        }, 100);
        return false;
    });
    // Add a new resource on modal window.
    $(document).on('click', '.modal form.resource-form #page-actions button[type=submit]', function(e) {
        // Warning: the submit may not occur when the modal is not focus.
        $('form.resource-form').submit();
        // TODO Manage error after submission (via ajax post?).
        // To avoid most issues for now, tab "Media" and "Thumbnail" are hidden.
        // Anyway, the user is working on the main resource.
        if ($('form.resource-form').data('has-error') === true) {
            e.preventDefault();
        } else {
            window.localStorage.removeItem('modal');
            // Leave time to submit the form before closing form.
            setTimeout(function() {
                window.close();
            }, 1000);
        }
        return false;
    });
    // Cancel modal window.
    $(document).on('click', '.modal form.resource-form #page-actions a.cancel', function(e) {
        e.preventDefault();
        window.localStorage.removeItem('modal');
        window.close();
        return false;
    });

});
