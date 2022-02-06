function addListener(page) {
    switch (page) {
        case "index.html":
        case "feature.html":
        case "howtouse.html":
        case "docs.html":
        case "tips.html":
            break;
        case "demo.html":
            document.querySelector('#btn4').addEventListener('input', () => {
                let temp_number=document.querySelector('#btn4').value;
                if (temp_number>3) document.querySelector('#btn4').value=3;
                if (temp_number<1) document.querySelector('#btn4').value=1;
                etm.sync();
            });
            document.querySelector('#btn6').addEventListener('click', () => {
                let addNumber=document.querySelector('#btn5').value;
                if (addNumber=='') { return; }
                if ( addNumber>100 ) { addNumber='too big'; }
                if ( addNumber<0 ) { addNumber='too small'; }
                et.list.push(addNumber);
                etm.sync();
            });
            document.querySelector('#btn7').addEventListener('click', () => {
                et.list.pop();
                etm.sync();
            });
            
            document.querySelector('#btn8').addEventListener('click', () => {
                if (et.rows[0]==1)  {
                    et.rows.splice(0,7);
                    et.rows.push(0, 0, 1, 1, 2, 2, 2);
                } else {
                    et.rows.splice(0,7);
                    et.rows.push(1, 1, 2, 2, 0, 0, 0);
                }
                etm.sync();
            });
            break;
    } 
    activateNav();
}