<Templates for HTML and CSS>

* Developed for consecutive own Vanilla Javascript projects.
* As simple usage as possible for Javascript user.
* As less option settings and complicated declaration as possible
* Features that my team needed,
* Template for variables, template for statements, Synchronously change values, inclusion of HTML modules...

<EXAMPLE - HTML>

<div>
    <ul>
        <% et.data.forEach(function(val){ %>
            <li>
                <%= val %>
            </li>
        <% }) %>
    </ul>
</div>

<EXAMPLE - CSS>

.abc {
    width: <%= abc_width %>
    color: <%= abc_color %>
}
⁎ templates inside <style> tag or linked CSS files
⁎ Only <%= %>, simple template is available for CSS

<TAGS>
    <%  Template tag, for contorl-flow, no output
    <%=  for variables / calculation or manipulation of variables
    <%%  Output a literal '<%'
    %>  End of tag

    <% include(' ... path/filename.html ... ') %>

    modules can be included upto three levels as below.

    feature.html >  _header.html
                    _main.html >    _main_upper.html
                                    _main_lower.html

<render() and parameters>

const etm=new eTemplate();

etm.render({
    sync_url: "path", 
    start_url: "path", 
    scrollto: { id: "id", block: "start | center | end" },
    sync_type: "default: element | whole",
    iscope: default: null | "body"
});

    What it does: Render html files including templates.

    * eTemplate doesn't accept data. Just declare variables which is used in templates before you execute render().

    Parameters:
    • All the parameters are optional 

    • sync_url: string
        sync_url: '/feature.html'

            - path of html file to replace current html with (optional)
            - Use this parameter if all the html files are rendered in single page.
            - If you omit this, render() find and render start_url, in case there is no start_url it will render current html file.

    • scrollto: object
        scrollto: { id: "id", block: "start | center | end" }
        
        • id: id of element to scroll to inside the html file of the second argument, sync_url

        • block: vertical alignment of the element. One of "start", "center", or "end"

    • sync_class: string
        sync_class: "default: et_sync" 
        
        • class name to specify elements to be re-rendered when sync() is executed.
        • If you omit this, the class name "et_sync" will be added to parent elements of templates or template blocks.
        • If there is no parent element, just before the template, <span> tag will be added as a parent element.
        • If you don't want this <span> tag, surround templates with a tag that you want, such as <div>.
        • In case a template is used in the attribute of tag, the class name will be added to the tag, itself.
        (<Input class="et_sync" type="text" value="<%= data%> data-sync="data">)

    • iscope: string
        iscope: "body" 

        - render() finds out linked CSS files and <style> tags, and check templates inside them.
        Even though there is no template, all CSS elements have to be checked for templates, and it might takes a bit.
        - If there is no template in CSS files, you can reduce a delay by setting this parameter.
        - If iscope is set to "body", render() skips checking CSS files.

<addListener()>

addListener() { ... event handler code ... }

    What it does: add collection of event-handlers for elements

    Why needed: 
        - render() is an async function that includes file reading.
        - To add an event-handler after a page rendered, there are two ways.

    • one way to add handler with then() as below.

    etm.render()).then(() => {
        ... add event-handler for elements ...
    });

    • The other way is appending event-handlers inside 'addListener()' and it will be executed in render() and sync() if sync_type parameter is "whole".

<sync()>

sync("body")

    What it does: refresh all the elements that has templates on current page

    sync()

    • To refresh templates when variables change from click, mouseover, and other events,
      add this function in the event-handling scripts.

    • It refreshes all the templates of not only values but also if else / while blocks.
      (HTML tags would be rendered accordingly)

    • Of course, syncTemplate() should be executed after variables change

    Parameter:  
    
    • "body": string

    • If you omit this, sync() will refresh all the templates of HTML and CSS.
    • In case there is no template in CSS, you can speed up refereshing templates.

    <input type="number" value="<%= et.data[0] %>" data-sync="et.data[0]" oninput="etm.sync()">
 
    ABOVE: 'oninput' event-handler inside <INPUT> tag
    BELOW: seperate event-handler inside <script> tag instead of script inside <INPUT> tag
 
    document.querySelector('input').addEventListener('input',() => { etm.sync() });

    - Set an attribute "data-sync" to a variable name as above.
    - Then, value of <input> tag will be input to the variable.
   