import { Link } from "react-router-dom"; 
import React, { Component } from 'react';


function Home() {
  return(
	<>
		<div class="hero">
				<div class="container">
					<div class="row justify-content-between">
						<div class="col-lg-5">
							<div class="intro-excerpt">
								<h1>Eagl'd</h1>
								<p class="mb-4">Find quality products from other UNT students. </p>
								<p><Link to="/shop" class="btn btn-secondary me-2">Shop Now</Link></p>
							</div>
						</div>
						<div class="col-lg-7">
							<div class="hero-img-wrap">
								<img src="bird.png" alt="Eagle Logo" class="img-fluid" width="300" height="300"/>
							</div>
						</div>
					</div>
				</div>
			</div>

		<div class="product-section">
			<div class="container">
				<div class="row">

					<div class="col-12 col-md-4 col-lg-3 mb-5 mb-md-0">
						<Link class="product-item" to="/shop?category=Textbooks">
							<img src="books.png" class="img-fluid product-thumbnail"/>
							<h3 class="product-title">Textbooks</h3>
							

							<span class="icon-cross">
								<img src="cross.svg" class="img-fluid"/>
							</span>
						</Link>
					</div> 
					<div class="col-12 col-md-4 col-lg-3 mb-5 mb-md-0">
						<Link class="product-item" to="/shop?category=Clothes">
							<img src="clothes.png" class="img-fluid product-thumbnail"/>
							<h3 class="product-title">Clothes</h3>

							<span class="icon-cross">
								<img src="cross.svg" class="img-fluid"/>
							</span>
						</Link>
					</div>
					<div class="col-12 col-md-4 col-lg-3 mb-5 mb-md-0">
						<Link class="product-item" to="/shop?category=Furniture">
							<img src="furniture.png" class="img-fluid product-thumbnail"/>
							<h3 class="product-title">Furniture</h3>

							<span class="icon-cross">
								<img src="cross.svg" class="img-fluid"/>
							</span>
						</Link>
					</div>
					<div class="col-12 col-md-4 col-lg-3 mb-5 mb-md-0">
						<Link class="product-item" to="/shop?category=Technology">
							<img src="computer.png" class="img-fluid product-thumbnail"/>
							<h3 class="product-title">Technology</h3>

							<span class="icon-cross">
								<img src="cross.svg" class="img-fluid"/>
							</span>
						</Link>
					</div>

				</div>
			</div>
		</div>
	</>
	 )
}

export default Home;