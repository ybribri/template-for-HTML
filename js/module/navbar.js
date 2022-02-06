function activateNav() {

    // common js for nav-bar    
    let href=window.location.href;
    let lastpart = href.split('#').pop();
    if (href==lastpart) lastpart='index';
    let temp='';

    let navLinks=document.querySelectorAll('.nav-link');
    navLinks.forEach(navLink => {
        navLink.classList.remove('active');
        temp=navLink.getAttribute('href');
        if (temp.includes('#')) {
            temp=temp.substring(1);
            if (lastpart==temp) navLink.classList.add('active');
            navLink.addEventListener('click', () => {
                temp=navLink.getAttribute('href').substring(1);
                et.head_title="Templates for HTML - "+temp;
                if (temp=='index') { et.head_title="Templates for HTML - about"; }
                if (temp.length!=0) etm.render({ syncUrl: temp+'.html' });
            });
        } 
    });
    
    let sumItems=document.querySelectorAll('.sum_item');
    sumItems.forEach(sumItem=> {
        sumItem.addEventListener('click',()=>{
            let itemId=sumItem.getAttribute('id');
            let href=window.location.href;
            let firstpart = href.split('#')[0];
            window.location.href=firstpart+'#feature';
            et.head_title="Templates for HTML - feature";
            etm.render({
                syncUrl: `feature.html`,
                scrollTo: {id:itemId, block:"center"}
            });
        });
    });

    // hamburger menu appearing in nav bar when window width is smaller
    let hamburgers=document.querySelectorAll('.hamburger');
    hamburgers.forEach(hamburger=>{
        hamburger.addEventListener('click',()=>{
            hamburger.classList.toggle('active');
            if (hamburger.classList[1]==undefined) {
                document.querySelector('.container-fluid').style.display="none";
            } else {
                document.querySelector('.container-fluid').style.display="block";
            }

        });
    });

    // navbar  display depending on window width
    window.addEventListener('resize', ()=>{
        let windowsize=window.outerWidth;
        let containerFluids=document.querySelectorAll('.container-fluid');
        if (windowsize<670) {
                containerFluids.forEach(containerFluid=> {
                    containerFluid.style. display='none';
                });
        } else {
                containerFluids.forEach(containerFluid=> {
                    containerFluid.style. display='block';
                });
        }
    });

    window.onhashchange = function() {
        if (!window.innerDocClick) {
            let temp='';
            let href=window.location.href;
            let lastpart = href.split('#').pop();
            if (href.includes('#') && lastpart.trim().length!=0) {
                if (lastpart=="index") { temp="about"} else { temp=lastpart; }
                et.head_title="Templates for HTML - "+temp;               
                etm.render({ syncUrl:`${lastpart}.html` });
            } else {
                if (et.start_url!==undefined) { 
                    temp=et.start_url.split('.')[0];
                    et.head_title="Templates for HTML - "+temp;
                    etm.render({ syncUrl: et.start_url });
                }
                else {
                    et.head_title="Templates for HTML - about";
                    etm.render({ syncUrl: 'index.html' });
                }
            }
        }
    }

}