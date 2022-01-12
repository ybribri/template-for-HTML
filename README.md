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

<TAGS>
    <%  Template tag, for contorl-flow, no output
    <%=  for variables / calculation or manipulation of variables
    <%%  Output a literal '<%'
    %>  End of tag

    <% include(' ... path/filename.html ... ') %>

    modules can be included upto three level as below


<render() and parameters>

const etm=new eTemplate();

etm.render({
    data: { data },
    sync_url: "path", 
    start_url: "path", 
    scrollto: { id: "id", block: "start | center | end" },
    sync_type: "default: element | whole",
    iscope: default: null | "body"
});

    What it does: Render html files including templates.

    Parameters:
    • All the parameters are optional including even data object 
        when
        1. You use only "<% include( ... ) %>" for HTML modules. Or,
            <% include('/module/_feature.html') %>
        2. You use global variables for template scripts.
            <%= data.join() %>

        let data={ points: [70, 80, 90] };
        eTemplate();

• data: object
    data: 
        { 
            points: [70, 80, 90], 
            grade: ['C', 'B', 'A'], 
            school: 'ABC highschool'
        }

        <div><%= et.points.join() %></div>
        <div><%= et.grade[1] %></div>

        - data to be used for templates in HTML. 
          (optional, omit this if you use global variables for templates)
        - object would be stored into a variable "et" as examples.

• sync_url: string
    sync_url: '/feature.html'

        - path of html file to replace current html with (optional)
        - Use this parameter if all the html files are rendered in single page.
        - If you omit this, render() find and render start_url, in case there is no start_url it will render current html file.

• scrollto: object
    scrollto: { id: "id", block: "start | center | end" }
       
    • id: id of element to scroll to inside the html file of the second argument, sync_url

    • block: vertical alignment of the element. One of "start", "center", or "end"

• sync_type: string
    sync_type: "element(default) | body" 
    
    - method of re-rendering when sync() is executed. • default, element is for re-rendering elements including templates.
    - whole is for re-rendering the whole page.
    - Rendering element by element is much faster but, there is one restriction.
    (if you use templates on attributes inside HTML tag, it's limited to only one attribute  as below.

    (X) <div class="<%= et.class[0] %>" id="<%= et.id[0] %>">
    (O) <input type="number" value="<%= et.data[0] %>" data-sync="et.data[0]" oninput="etm.sync(event)">
    (O) <% for(var i=0; i<et.imgSrc.length; i++){ %>
            <div class="img">
                <img src="<%= et.imgSrc[i] %>">
                <div class="img_text">
                    <span>
                        <%= et.imgText[i] %>
                    </span>
                </div>
            </div>
        <% } %>

• iscope: string
    iscope: "body" 

    - render() finds out linked CSS files and check templates inside them.
    Even though there is no template, all CSS elements have to be checked for templates, and it takes a while.
    - If there is no template in CSS files, you can reduce a delay to check them by setting this parameter.
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

sync(event)

    What it does: refresh all the elements that has templates on current page

    sync()

    • To refresh templates when variables change from click, mouseover, and other events,
      add this function in the event-handling scripts.

    • It refreshes all the templates of not only values but also if else / while blocks.
      (HTML tags would be rendered accordingly)

    • Of course, syncTemplate() should be executed after variables change

    Parameter:  
    
    • event: event object
    • event passed only from 'INPUT' tag
      (use this parameter only to pass event object from <INPUT> tag)

    <input type="number" value="<%= et.data[0] %>" data-sync="et.data[0]" oninput="etm.sync(event)">
 
    ABOVE: 'oninput' event-handler inside <INPUT> tag
    BELOW: seperate event-handler inside <script> tag instead of script inside <INPUT> tag
 
    document.querySelector('input').addEventListener('input',(event) => { etm.sync(event) });

    - Set an attribute "data-sync" to a variable name as above.
    - Then, value of <input> tag will be input to the variable.
   