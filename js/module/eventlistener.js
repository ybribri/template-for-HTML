function addListener(page) {
    switch (page) {
        case "index.html":
        case "feature.html":
        case "howtouse.html":
        case "docs.html":
        case "tips.html":
            break;
        case "demo.html":
            document.querySelector('#btn4').addEventListener('input', (event) => {
                let temp_number=document.querySelector('#btn4').value;
                if (temp_number>3) document.querySelector('#btn4').value=3;
                if (temp_number<1) document.querySelector('#btn4').value=1;
                etemplate.sync(event);
            });
            document.querySelector('#btn6').addEventListener('click', () => {
                let addNumber=document.querySelector('#btn5').value;
                if (addNumber=='' || addNumber>100 || addNumber<0 ) { return; }
                et.list.push(addNumber);
                etemplate.sync();
            });
            document.querySelector('#btn7').addEventListener('click', () => {
                et.list.pop();
                etemplate.sync();
            });
            
            document.querySelector('#btn8').addEventListener('click', () => {
                if (et.rows[0]==1)  {
                    et.rows.splice(0,7);
                    et.rows.push(0, 0, 1, 1, 2, 2, 2);
                } else {
                    et.rows.splice(0,7);
                    et.rows.push(1, 1, 2, 2, 0, 0, 0);
                }
                etemplate.sync(event);
            });
            break;
    } 
    activateNav();
}