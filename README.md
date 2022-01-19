# Templates for HTML and CSS

* Developed for consecutive own Vanilla Javascript projects.
* As simple usage as possible for Javascript user.
* As less option settings and complicated declaration as possible
* Features that my team needed,
* Template for variables, template for statements, Synchronously change values, inclusion of HTML modules...


### TAGS
```
<%    Template tag, for contorl-flow, no output
<%=   for variables / calculation or manipulation of variables
<%%   Output a literal '<%'
%>    End of tag

      <% include(' ... path/filename.html ... ') %>
```
* modules can be included upto three levels as below.

```
    feature.html >  _header.html
                    _main.html >    _main_upper.html
                                    _main_lower.html
```
### EXAMPLE - HTML
```
<div>
    <ul>
        <% et.data.forEach(function(val){ %>
            <li>
                <%= val %>
            </li>
        <% }) %>
    </ul>
</div>
```
### EXAMPLE - CSS
```
.abc {
    width: <%= abc_width %>
    color: <%= abc_color %>
}
```
- templates inside _style_ tag or linked CSS files
- Only <%= %>, simple template is available for CSS


### render() and parameters
> **Render all the templates in HTML and CSS including html modules and linked CSS files**
    
```
const etm=new eTemplate();

etm.render({
    sync_url: "path", 
    start_url: "path", 
    scrollto: { id: "id", block: "start | center | end" },
    sync_type: "default: element | whole",
    iscope: default: null | "body"
});
```
> **eTemplate doesn't accept data. Just declare variables which is used in templates before you execute render()**

#### **Arguments**
* All the arguments are optional.

> **sync_url** : string  `sync_url: "/feature.html"`

* path of html file to replace current html with (optional)
* Use this parameter if all the html files are rendered in single page.
* If you omit this, render() find and render start_url, in case there is no start_url it will render current html file.

> **scrollto** : object  `scrollto: { id: "id", block: "start | center | end" }`

* **id** : id of element to scroll to inside the html file of the second argument, sync_url
* **block** : vertical alignment of the element. One of "start", "center", or "end"

> **sync_class** : string  `sync_class: "default: et_sync"`
        
* class name to specify elements to be re-rendered when sync() is executed.
* If you omit this, the class name _"et_sync"_ will be added to parent elements of templates or template blocks.
* If there is no parent element, just before the template, <span> tag will be added as a parent element.
* If you don't want this _span_ tag, surround templates with a tag that you want, such as _div_ tag.
* In case a template is used in the attribute of tag, the class name will be added to the tag, itself.
```
<Input class="et_sync" type="text" value="<%= data%> data-sync="data">
```
                                                                     
> **iscope** : string  `iscope: "body"`

* render() finds out linked CSS files and _style_ tags, and check templates inside them. Even though there is no template, all CSS elements have to be checked for templates, and it might takes a bit.
* If there is no template in CSS files, you can reduce a delay by setting this parameter.
* If iscope is set to "body", render() skips checking CSS files.

### sync()
> refresh all the elements that has templates on current page
      
```
sync("body");
```

* To refresh templates when variables change from click, mouseover, and other events, add this function in the event-handling scripts.

```
   document.querySelector('.btn').addEventListener('click', () => {
      cnt ++;
      etm.sync();
   });
```
      
* It refreshes all the templates of not only **values** but also **if, if else, for, forEach, switch, while.. blocks**.
* HTML tags inside template statements will be rendered accordingly.

#### **Argument**
* This argument is optional.
    
> **"body"**
      
* If you omit this, sync() will refresh all the templates of HTML and CSS.
* In case there is no template in CSS, you can speed up refereshing templates.

> 'oninput' event-handler inside <INPUT> tag    
```    
<input type="number" value="<%= et.data[0] %>" data-sync="et.data[0]" oninput="etm.sync()">
```

> seperate event-handler inside <script> tag instead of script inside <INPUT> tag    
```
document.querySelector('input').addEventListener('input',() => { etm.sync() });
```
    
* Set an attribute "data-sync" to a variable name as above.
* Then, value of <input> tag will be input to the variable.
   
      
      
### addListener()
> declare **function addListener** as a collection of event-handlers **only of elements affected by template scripts**.
      
`function addListener() { ... event handler code ... }`

* If you want to add event-handlers to elements affected by templates scripts, like rendered tags by if, or for...
* Every time render() or sync() is executed, the rendered or refreshed elements are refreshed and lose their event-handlers.
* Event-handlers declared in addListener() will be activated automatically after render() or sync()
* **Don't insert event-handlers of other elements that are not affected by template scripts. It'll add the same event-handler to the element multiple times.**

> For other cases, see below.
      
```
etm.render()).then(() => {
    ... add event-handlers here or call a function that has event-handlers ...
});
```
