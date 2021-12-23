function activateNav() {

    // common js for nav-bar    
    let href=window.location.href;
    let lastpart = href.split('#').pop();
    if (href==lastpart) lastpart='about';
    let temp='';

    let navLinks=document.querySelectorAll('.nav-link');
    navLinks.forEach(navLink => {
        navLink.classList.remove('active');
        temp=navLink.getAttribute('href');
        if (temp.indexOf('#')!=-1) {
            temp=temp.substring(1);
            if (lastpart==temp) navLink.classList.add('active');
            navLink.addEventListener('click', () => {
                temp=navLink.getAttribute('href').substring(1);
                if (temp.length!=0) eTemplate({ sync_url: temp+'.html' });
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
            eTemplate({
                sync_url: `feature.html`,
                scrollto: {id:itemId, block:"center"}
            });
        });
    });

    let hamburgers=document.querySelectorAll('.hamburger');
    hamburgers.forEach(hamburger=>{
        hamburger.addEventListener('click',()=>{
                hamburger.classList.toggle('active');
                let containerFluids=document.querySelectorAll('.container-fluid');
                containerFluids.forEach(containerFluid=> {
                        if (containerFluid.style. display=='none') {
                                containerFluid.style. display='block';
                            } else {
                                containerFluid.style. display='none';
                            }
                });
        });
    });

    
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

}