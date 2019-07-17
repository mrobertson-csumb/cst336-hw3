/* --- global vars --------------------------------------------------------- */
let county = $('#county');
let submit = $('#employment_data');
let monthYear = $('#month_year');
let tableHeader = $('#header_row');
let tableRows = $('#data_rows');

// Limit output for testing
// -1 means no limit
//  0 means don't call the api at all
const OUTPUT_LIMIT = -1;

/* --- event listeners ---------------------------------------------------- */
window.onload = init();

/**
 * populates external data, wires up events & widgets
 */
function init() {
    getCounties();

    // create datepicker widget
    monthYear.monthpicker({
        changeYear: true,
        minDate: "-0 M -10 Y",
        maxDate: "-1 M"
    });

    // submit -> prevent-default & populate the data table
    submit.on('submit',
        () => {
            event.preventDefault();
            let isValid = validate(showError);

            if (isValid) {
                let date = extractDate();
                let month = date.toLocaleString('default', {month: 'long'});
                let year = date.getFullYear();

                getTableData(county.val(), month, year)
            }
        }
    );
}

/* --- functions ---------------------------------------------------------- */

/**
 * Executes an arbitrary query against California Employment Development
 * Department's (CA EDD) data.
 * Usually will be followed by a call to done(data => {...})
 * which will handle the query results.
 * @param query the query to execute
 * @returns an jqeury deferred ajax object.
 */
function queryEDD(query) {
    if (OUTPUT_LIMIT === 0) {
        console.log(`output limit is 0, preventing api call.\nQuery was: ${query}`);
        return $.Deferred().resolve([]).promise();
    }
    let limitClause = OUTPUT_LIMIT > 0 ? `LIMIT ${OUTPUT_LIMIT}` : '';
    query = `${query} ${limitClause}`;
    return $.ajax({
        url: "https://data.edd.ca.gov/resource/r4zm-kdcg.json",
        type: "GET",
        data: {
            "$query": query,
            /*"$$app_token" : "YOURAPPTOKENHERE"*/
        }
    })
}

/**
 * Gets a list of California counties from CA EDD
 */
function getCounties() {
    let query = `SELECT area_name WHERE area_type = 'County' GROUP BY area_name`;
    queryEDD(query)
        .done(data => {
            county.empty();
            county.append(`<option value="">- Select One -</option>`);
            data.forEach(e =>
                county.append(`<option value="${e.area_name}">${e.area_name}</option>`));
        });
}

/**
 * Gets a table of Employment Data from CA EDD
 * @param county the county to lookup
 * @param month the month to lookup
 * @param year the year to lookup
 */
function getTableData(county, month, year) {
    let query = `SELECT industry_title, seasonally_adjusted, current_employment` +
        ` WHERE area_name = '${county}' AND month = '${month}' AND year = '${year}'` +
        ` ORDER BY industry_title`;
    queryEDD(query, 5).done(data => populateTable(data));
}

/**
 * A convenience function to extract a date from the monthYear field.
 * @returns {Date}
 */
function extractDate() {
    let [m, year] = monthYear.val().split('/');

    let date = new Date(year, m - 1, 1);
    console.log(date);
    return date;
}


/**
 * Populates the table given some table data
 * Note: the table data can be any homogeneous array of objects,
 * the header row will be based on the first element's keyset and
 * subsequent rows will be populated based on lookups against that
 * keyset.
 * @param data the data to populate into the table
 */
function populateTable(data) {
    // clear the table
    tableHeader.empty();
    tableRows.empty();

    if (data.length <= 0) {
        tableHeader.append(`<td>Query yielded 0 results.</td>`);
        return;
    }

    // populate header row
    let columns = Object.keys(data[0]);
    columns.forEach(c =>
        tableHeader.append(`<td>${c.replace('_', ' ')}</td>`));

    // populate data item rows
    data.forEach(i => {
        let rowData = '';
        columns.forEach(c => rowData += (`<td>${i[c]}</td>`));
        tableRows.append(`<tr>${rowData}</tr>`)
    })
}


/**
 * Shows an error message on a given target element
 * @param target the element to display the error on
 * @param message the message to display
 */
function showError(target, message) {
    target.html(`<span class="alert alert-danger"><strong>${message}</strong></span>`);
    target.show()
}


/**
 * Validates the currently submitted form,
 * executes the given callbacks if applicable
 * returns true if the validation passes
 * @param errorCallBack a callback for messaging to the user that
 *        a validation error occurred
 * @returns {boolean} true if validation passes
 */
function validate(errorCallBack) {

    let cntyMsg = $('#cnty_msg');
    let myMsg = $('#m_y_msg');
    let isValid = true;

    // clear messages
    cntyMsg.hide();
    myMsg.hide();

    // must select a county
    if (county.val() === '') {
        isValid = false;
        errorCallBack(cntyMsg, 'select a county')
    }

    // must select a month & year
    let date = extractDate();

    // month & year should be after 2008 and before this month
    let endDate = new Date();
    let startDate = new Date(2009, 0, 1);
    endDate.setMonth(endDate.getMonth() - 1);

    if (date.toString() === 'Invalid Date') {
        isValid = false;
        errorCallBack(myMsg, 'select a valid date')
    }

    if (date < startDate) {
        isValid = false;
        errorCallBack(myMsg, `choose a month & year after ${startDate.getMonth() + 1}/${startDate.getFullYear()}`)
    }

    if (endDate <= date) {
        isValid = false;
        errorCallBack(myMsg, `choose a month & year before ${endDate.getMonth() + 2}/${endDate.getFullYear()}`)
    }

    return isValid;
}
